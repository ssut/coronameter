import { ExchangeMessage } from './models/exchange.message';
import { ServerMessageType } from './models/server-message-type.enum';
import { genPrimes } from './../utils/prime/primitive-root';
import { Lang } from './models/lang.enum';
import { FastifyInstance, FastifyRequest } from 'fastify';
import 'fastify-websocket';
import websocketPlugin = require('fastify-websocket');
import { redis } from '../database';
import * as uuid from 'uuid';
import * as isUUID from 'is-uuid';
import * as _ from 'lodash';
import * as crypto from 'crypto';
import useragent from 'useragent';
import { plainToClass } from 'class-transformer';
import { ClientMessage } from './models/client-message';
import { validate } from 'class-validator';
import { ClientMessageOperation } from './models/client-message-operation.enum';
import { HelloMessage } from './models/hello.message';
import { serialize } from 'class-transformer';
import Config from '../config';
import * as randomNumber from 'random-number-csprng';
import { Message } from './models/message';
import * as namer from 'korean-name-generator';
import { RedisClient } from 'redis';

const globalSubscribeClient = redis.redis.duplicate();
globalSubscribeClient.setMaxListeners(Infinity);

interface ChatData {
  /** clientId (uuid) */
  c: string;
  /** timestamp */
  t: number;
  /** nickname */
  n: string;
  /** message */
  m: string;
}

class Chat {
  public static readonly prefix = 'coronameter:chats';
  public static readonly clients = new Map<string, RedisClient>();

  public static readonly scripts = {
    ratelimit: {
      script: `
        redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, ARGV[1] - 60 * 1000)
        if tonumber(redis.call('ZCARD', KEYS[1])) < tonumber(ARGV[2])
        then
          redis.call('ZADD', KEYS[1], ARGV[1], ARGV[1])
          return '0'
        else
          return '1'
        end
      `,
      hash: '',
      /**
       * true means okay
       * false means not okay
       */
      async fn(clientId: string, limit = 10) {
        const sha = Chat.scripts.ratelimit.hash;
        const key = `${Chat.prefix}:clients:${clientId}:limit`;

        return Number(await redis.evalsha(sha, 1, [key], [String(Date.now()), String(limit)])) === 0;
      },
    },
  };

  public static async initialize() {
    const { keys, multi } = Object.entries(this.scripts).reduce(({ keys, multi }, [key, { script }]) => ({
      keys: [...keys, key],
      multi: multi.script('load', script),
    }), {
      keys: [] as string[],
      multi: redis.multi(),
    });

    for (const [key, hash] of _.zip(keys, await redis.execMulti(multi))) {
      (this.scripts as any)[key!].hash = hash as string;
    }
  }

  public static async getChannelNames() {
    const channels = [] as string[];

    let cursor = 0;
    for (; ;) {
      const [nextCursor, keys] = await redis.scan(cursor, ['MATCH', `${this.prefix}:channels:*:exists`], ['COUNT', 10]);
      const hasNextCursor = nextCursor !== '0';

      channels.push(...keys.map(key => key.replace(new RegExp('^' + _.escapeRegExp(`${this.prefix}:channels:`)), '').replace(/:exists$/, '')));

      if (!hasNextCursor) {
        break;
      }
      cursor = nextCursor;
    }

    return channels;
  }

  public static async extendClient(clientId: string) {
    const clientKey = `${this.prefix}:clients:${clientId}`;

    if (!(await redis.exists(clientKey))) {
      return;
    }

    const nickname = await redis.hget(clientKey, 'nickname');
    const nicknameKey = `${this.prefix}:nicknames:${nickname}`;

    await redis.expire(clientKey, 60);
    await redis.expire(nicknameKey, 60);
  }

  public static async ensureNickname(clientId: string) {
    for (; ;) {
      const nickname = namer.generate();

      const clientKey = `${this.prefix}:clients:${clientId}`;
      const nicknameKey = `${this.prefix}:nicknames:${nickname}`;

      const clientNickname = await redis.hget(clientKey, 'nickname');
      if (typeof clientNickname === 'string' && clientNickname.length > 0) {
        // extend
        await redis.expire(clientKey, 60);
        await redis.expire(nicknameKey, 60);

        return clientNickname;
      }

      if (await redis.exists(nicknameKey)) {
        continue;
      }

      await redis.hset(clientKey, 'nickname', nickname);
      await redis.expire(clientKey, 60);
      await redis.setex(nicknameKey, 30, clientId);

      return nickname;
    }
  }

  public static async createChannel() {
    const key = `${this.prefix}:channels:id`;

    const id = String(await redis.incr(key));
    await redis.set(`${this.prefix}:channels:${id}:exists`, '1');

    return id;
  }

  public static async ensureChannel() {
    const channelNames = await this.getChannelNames();

    for (let i = 0; ; i++) {
      let channelName = channelNames[i];
      if (!channelName) {
        channelName = await this.createChannel();
      }

      const num = await redis.pubsub('NUMSUB', `${this.prefix}:channels:${channelName}`);
      if (num >= Config.Chat.maxUsersPerChat) {
        continue;
      }

      return channelName;
    }
  }

  public static getSubscribeClient(channelName: string) {
    if (this.clients.has(channelName)) {
      return this.clients.get(channelName);
    }

    const client = redis.redis.duplicate();
    client.setMaxListeners(Infinity);
    client.subscribe(`${this.prefix}:channels:${channelName}`);
    this.clients.set(channelName, client);

    return client;
  }

  public static async getChannelParticipant(channelName: string) {
    const [, num] = await redis.pubsub('NUMSUB', `${this.prefix}:channels:${channelName}`);

    return num;
  }

  public static async publish(channelName: string, data: ChatData) {
    await redis.publish(`${this.prefix}:channels:${channelName}`, JSON.stringify(data));
  }
}

class WebsocketConnectionHandler {
  private onRedisMessageCallback: any;

  private clientId!: string;
  private sessionId!: string;
  private lang!: Lang;
  private fingerprint!: string;
  private channel!: string;
  private nickname!: string;

  private hello!: string;
  private iv!: Buffer;
  private ecdh!: crypto.ECDH;
  private key!: Buffer;
  private secret!: Buffer;

  private isSubscribing = false;

  // private cipher!: crypto.Cipher;
  // private decipher!: crypto.Decipher;

  private subscribeClient?: RedisClient;

  private getCipher() {
    if (!this.iv || !this.secret) {
      return null;
    }

    return crypto.createCipheriv('aes-256-cbc', this.secret, this.iv);
  }

  private getDecipher() {
    if (!this.iv || !this.secret) {
      return null;
    }

    return crypto.createDecipheriv('aes-256-cbc', this.secret, this.iv);
  }

  public constructor(
    private readonly connection: websocketPlugin.SocketStream,
    private readonly request: FastifyRequest,
  ) {
    this.connection.setDefaultEncoding('utf8');
    this.connection.setEncoding('utf8');
    this.connection.on('data', this.onMessage.bind(this));
    this.connection.on('close', this.dispose.bind(this));
    this.connection.on('end', this.dispose.bind(this));

  }

  public async initialize() {
    this.iv = crypto.randomBytes(16);
    this.ecdh = crypto.createECDH('secp256k1');
    this.key = this.ecdh.generateKeys();

    this.send({
      ts: -1,
      type: ServerMessageType.Request,
      data: {
        i: this.iv.toString('hex').split(/(?:)/g).reverse().join(''),
        k: this.key.toString('base64'),
      },
    });
  }

  public send(message: Message) {
    this.connection.write(serialize(message));
  }

  public sendEncrypted(message: Message) {
    const cipher = this.getCipher();

    let encrypted = cipher.update(Buffer.from(serialize(message)));
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    this.connection.write(serialize({
      $: encrypted.toString('base64'),
    }));
  }

  public async onRedisMessage(channel: string, message: string) {
    if ((this.channel?.length ?? 0) === 0 || !channel.includes(`:${this.channel}`)) {
      return;
    }

    const data = JSON.parse(message) as ChatData;

    this.sendEncrypted({
      ts: -1,
      type: ServerMessageType.Message,
      data,
    });
  }

  public dispose() {
    this.subscribeClient?.removeListener('message', this.onRedisMessageCallback);
  }

  public async onMessage(raw: any) {
    let data = JSON.parse(raw);
    if (typeof data.$ === 'string') {
      const decipher = this.getDecipher();

      let decrypted = decipher.update(Buffer.from(data.$, 'base64'));
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      data = JSON.parse(decrypted.toString());
    }

    const message = plainToClass<ClientMessage, any>(ClientMessage, data);
    if ((await validate(message)).length > 0) {
      return;
    }

    if (this.clientId?.length > 0 && this.nickname?.length > 0) {
      Chat.extendClient(this.clientId);
    }


    switch (message.op) {
      case ClientMessageOperation.Exchange: {
        const data = plainToClass<ExchangeMessage, any>(ExchangeMessage, message.data);
        if ((await validate(data)).length > 0) {
          return;
        }

        this.secret = this.ecdh.computeSecret(Buffer.from(data.k, 'base64'));
        if (this.secret.toString('base64') !== data.s) {
          throw new Error('encryption channel failed');
        }

        this.hello = uuid.v4();
        this.sendEncrypted({
          ts: -1,
          type: ServerMessageType.Exchange,
          data: {
            hello: this.hello,
          },
        });
      } break;

      case ClientMessageOperation.Hello: {
        const data = plainToClass<HelloMessage, any>(HelloMessage, message.data);
        if ((await validate(data)).length > 0) {
          return;
        }

        if (data.hello !== this.hello) {
          throw new Error('Hello mismatch');
        }

        this.clientId = data.clientId;
        this.sessionId = data.sessionId;
        this.lang = data.lang;
        this.fingerprint = data.fingerprint;

        this.nickname = await Chat.ensureNickname(this.clientId);
        this.channel = await Chat.ensureChannel();
        this.subscribeClient = await Chat.getSubscribeClient(this.channel);

        this.onRedisMessageCallback = this.onRedisMessage.bind(this);
        this.subscribeClient.on('message', this.onRedisMessageCallback);

        console.info(this.channel, this.nickname, await Chat.getChannelParticipant(this.channel)),

        this.sendEncrypted({
          ts: -1,
          type: ServerMessageType.Hello,
          data: {
            channel: this.channel,
            nickname: this.nickname,
            participant: await Chat.getChannelParticipant(this.channel),
          },
        });
      } break;

      case ClientMessageOperation.Message: {
        if (!this.channel) {
          throw new Error('There is no participating channel');
        }

        if (!(await Chat.scripts.ratelimit.fn(this.clientId, Config.Chat.rateLimitPerMinute))) {
          this.sendEncrypted({
            ts: message.ts,
            type: ServerMessageType.MessageResult,
            data: {
              sent: false,
              reason: 'ratelimit',
            },
          });
        } else {
          await Chat.publish(this.channel, {
            c: this.clientId,
            t: Date.now(),
            m: message.data,
            n: this.nickname,
          });

          this.sendEncrypted({
            ts: message.ts,
            type: ServerMessageType.MessageResult,
            data: {
              sent: true,
              reason: '',
            },
          });
        }
      } break;

      case ClientMessageOperation.Ping: {
        this.sendEncrypted({
          ts: message.ts,
          type: ServerMessageType.Pong,
          data: {
            participant: this.channel ? await Chat.getChannelParticipant(this.channel) : 0,
          },
        });
      } break;
    }
  }
}

export default async function (app: FastifyInstance) {
  await Chat.initialize();

  app.get('/chat', { websocket: true }, async (connection, req) => {
    const connectionHandler = new WebsocketConnectionHandler(connection, req);
    await connectionHandler.initialize();
  });
}
