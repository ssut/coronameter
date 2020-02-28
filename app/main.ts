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

  await sequelize.authenticate();
  await Stat.sync();

  // scrapAll().then((stats) => {
  //   for (const [province, stat] of Object.entries(stats)) {
  //     Stat.updateStats(province, stat);
  //   }
  // });

  instance.listen(Config.Port);
}

main();
