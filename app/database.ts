import { Sequelize } from 'sequelize';
import Config from './config';

export const sequelize = new Sequelize(Config.Postgres.URL, {
  logging: console.info,
});
