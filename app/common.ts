import './scrappers/init';

import { sequelize } from './database';
import nativeRedis from 'redis';
import Config from './config';
import { Stat } from './models';
import { CDCStat } from './models/cdc-stat';
import { redis as handyRedis } from './database';
import { CDCInfo } from './models/cdc-info';

export const redis = handyRedis.redis;

export async function initialize() {
  await sequelize.authenticate();
  await Stat.sync();
  await CDCInfo.sync();
  await CDCStat.sync();
}
