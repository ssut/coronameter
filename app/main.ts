import { scrapAll } from './scrappers/index';
import 'source-map-support/register';
import './scrappers/init';
import { sequelize } from './database';

import fastify from 'fastify';
import { bootstrap } from 'fastify-decorators';
import fsequelize from 'fastify-sequelize';
import { join } from 'path';

import {
  Stat,
} from './models';
import Config from './config';
import { initialize } from './common';

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

  instance.register(bootstrap, {
    controllersDirectory: join(__dirname, 'controllers'),
    controllersMask: /\.controller\./,
  });

  await initialize();

  instance.listen(Config.Port, (err, address) => {
    if (err) {
      throw err;
    }

    instance.log.info(`server listening on ${address}`);
  });
}

main();
