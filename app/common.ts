import { sequelize } from './database';
import nativeRedis from 'redis';
import Config from './config';
import { Stat } from './models';

export const redis = nativeRedis.createClient(Config.Redis);

export async function initialize() {
  await sequelize.authenticate();
  await Stat.sync();
}
