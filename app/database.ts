import { Sequelize } from 'sequelize';
import Config from './config';
import { createHandyClient } from 'handy-redis';

export const sequelize = new Sequelize(Config.Postgres.URL, {
  define: {
    schema: 'corona',
  }
});

export const redis = createHandyClient(Config.Redis);
