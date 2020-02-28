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
  const instance = fastify();

  instance.register(require('fastify-sensible'));

  instance.register(bootstrap, {
    controllersDirectory: join(__dirname, 'controllers'),
    controllersMask: /\.controller\./,
  });

  await initialize();

  instance.listen(Config.Port);
}

main();
