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

const subscribeClient = redis.redis.duplicate();
subscribeClient.setMaxListeners(Infinity);

class Chat {
  public static prefix = 'coronameter:chats';

  public static async getChannelNames() {
    const channels = [] as string[];

    let cursor = 0;
    for (; ;) {
      const [nextCursor, keys] = await redis.scan(cursor, ['MATCH', `${this.prefix}:channels:*`], ['COUNT', 10]);
      const hasNextCursor = nextCursor !== '0';

      channels.push(...keys.map(key => key.replace(new RegExp('^' + _.escapeRegExp(this.prefix)), '')));

      if (!hasNextCursor) {
        break;
      }
      cursor = nextCursor;
    }

    return channels;
  }

  public static async createChannel() {

  }

  public static async ensureChannel() {
    const channelNames = await this.getChannelNames();
    if (channelNames.length === 0) {
    }

    for (const channelName of channelNames) {
      const num = await redis.pubsub('NUMSUB', `${this.prefix}:channels:${channelName}`);
      if (num >= Config.Chat.maxUsersPerChat) {
        continue;
      }

    }

  }

  public static async getOrCreateNickname(clientId: string) {
  }
}

class WebsocketConnectionHandler {
  private onRedisMessageCallback: any;

  private clientId!: string;
  private sessionId!: string;
  private lang!: Lang;
  private fingerprint!: string;
  private nickname!: string;

  private hello!: string;
  private iv!: Buffer;
  private ecdh!: crypto.ECDH;
  private key!: Buffer;
  private secret!: Buffer;

  private cipher!: crypto.Cipher;
  private decipher!: crypto.Decipher;

  public constructor(
    private readonly connection: websocketPlugin.SocketStream,
    private readonly request: FastifyRequest,
  ) {
    this.connection.setDefaultEncoding('utf8');
    this.connection.setEncoding('utf8');
    this.connection.on('data', this.onMessage.bind(this));
    this.connection.on('close', this.dispose.bind(this));
    this.connection.on('end', this.dispose.bind(this));

    this.onRedisMessageCallback = this.onRedisMessage.bind(this);
    subscribeClient.on('message', this.onRedisMessageCallback);
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
    let encrypted = this.cipher.update(serialize(message));
    encrypted = Buffer.concat([encrypted, this.cipher.final()]);

    this.connection.write(serialize({
      e: 1,
      d: encrypted.toString('base64'),
    }));
  }

  public async onRedisMessage(channel: string, message: string) {
  }

  public dispose() {
    subscribeClient.removeListener('message', this.onRedisMessageCallback);
  }

  public async onMessage(raw: any) {
    let data = JSON.parse(raw);
    if (data.e === 1) {
      let decrypted = this.decipher.update(Buffer.from(data.d, 'base64'));
      decrypted = Buffer.concat([decrypted, this.decipher.final()]);
      data = JSON.parse(decrypted.toString());
    }

    const message = plainToClass<ClientMessage, any>(ClientMessage, data);
    if ((await validate(message)).length > 0) {
      return;
    }

    switch (message.op) {
      case ClientMessageOperation.Exchange: {
        const data = plainToClass<ExchangeMessage, any>(ExchangeMessage, message.data);
        if ((await validate(data)).length > 0) {
          return;
        }

        this.secret = this.ecdh.computeSecret(Buffer.from(data.k, 'base64'));
        this.cipher = crypto.createCipheriv('aes-256-cbc', this.secret, this.iv);
        this.decipher = crypto.createDecipheriv('aes-256-cbc', this.secret, this.iv);

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
      } break;
    }
  }
}

export default async function (app: FastifyInstance) {
  app.get('/chat', { websocket: true }, async (connection, req) => {
    const connectionHandler = new WebsocketConnectionHandler(connection, req);
    await connectionHandler.initialize();
  });
}
