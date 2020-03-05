import BeeQueue from 'bee-queue';
import Config from './config';

export const ScrapTaskQueue = new BeeQueue('scrap', {
  redis: Config.Redis,
  removeOnFailure: true,
  removeOnSuccess: true,
});

export const ScrapCDCTaskQueue = new BeeQueue('scrap_cdc', {
  redis: Config.Redis,
  removeOnFailure: true,
  removeOnSuccess: true,
});

export const scrapNaverTaskQueue = new BeeQueue('scrap_naver', {
  redis: Config.Redis,
  removeOnFailure: true,
  removeOnSuccess: true,
});
