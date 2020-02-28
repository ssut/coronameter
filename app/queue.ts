import BeeQueue from 'bee-queue';
import Config from './config';

export const ScrapTaskQueue = new BeeQueue('scrap', {
  redis: Config.Redis,
  removeOnFailure: true,
  removeOnSuccess: true,
});
