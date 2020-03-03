import { scrapAll } from './scrappers/index';
import 'source-map-support/register';
import './scrappers/init';
import { sequelize } from './database';

import fastify from 'fastify';
import { bootstrap } from 'fastify-decorators';
import fsequelize from 'fastify-sequelize';
import useragent from 'useragent';
import { join } from 'path';

import {
  Stat,
} from './models';
import Config from './config';
import { initialize } from './common';

import applyWebsocketHandler from './websocket/websocket.handler';

declare module 'fastify' {
  interface FastifyInterface {
    db: any;
  }
}

async function main() {
  const instance = fastify({
    logger: true,
    trustProxy: ['127.0.0.0/16'],
  });

  instance.register(require('fastify-log'));
  instance.register(require('fastify-sentry'), {
    dsn: Config.Sentry.DSN,
    attachStacktrace: true,
  });
  instance.register(require('fastify-sensible'));
  instance.register(require('fastify-cors'));
  instance.register(require('fastify-websocket'), {
    options: {
      maxPayload: 8192,
      verifyClient(info, next) {
        const ua = info.req.headers['user-agent'];
        const is = useragent.is(ua);
        if (!is || Object.values(is).every(x => x === false)) {
          return next(false);
        }

        return next(true);
      },
    },
  });

  instance.register(bootstrap, {
    controllersDirectory: join(__dirname, 'controllers'),
    controllersMask: /\.controller\./,
  });

  applyWebsocketHandler(instance);

  await initialize();

  instance.listen(Config.Port, (err, address) => {
    if (err) {
      throw err;
    }

    instance.log.info(`server listening on ${address}`);
  });
}

main();
