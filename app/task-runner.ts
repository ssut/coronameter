import { ScrapTaskQueue, ScrapCDCTaskQueue, scrapNaverTaskQueue } from './queue';
import { redis, initialize } from './common';
import * as tasks from './tasks';

const CronJob = require('cron-cluster')(redis).CronJob;

async function main() {
  await initialize();

  ScrapTaskQueue.process(tasks.scrap);
  ScrapCDCTaskQueue.process(tasks.scrapCDC);
  scrapNaverTaskQueue.process(tasks.scrapNaver);

  const scrapJob = new CronJob({
    cronTime: '0,10,30,50 * * * *',
    onTick() {
      ScrapTaskQueue.createJob({}).save();
    },
  });
  const scrapCDCJob = new CronJob({
    cronTime: '0,10,50 * * * *',
    onTick() {
      ScrapCDCTaskQueue.createJob({}).save();
    },
  });
  const scrapNaverJob = new CronJob({
    cronTime: '1,2,5,7,11,13 10,16,17 * * *',
    onTick() {
      scrapNaverTaskQueue.createJob({}).save();
    },
  });
  scrapJob.start();
  scrapCDCJob.start();
  scrapNaverJob.start();

  ScrapTaskQueue.createJob({}).save();
  ScrapCDCTaskQueue.createJob({}).save();
  scrapNaverTaskQueue.createJob({}).save();
}

main();
