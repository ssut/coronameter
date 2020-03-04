import { ScrapTaskQueue, ScrapCDCTaskQueue } from './queue';
import { redis, initialize } from './common';
import * as tasks from './tasks';

const CronJob = require('cron-cluster')(redis).CronJob;

async function main() {
  await initialize();

  ScrapTaskQueue.process(tasks.scrap);
  ScrapCDCTaskQueue.process(tasks.scrapCDC);

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
  // scrapJob.start();
  // scrapCDCJob.start();

  // ScrapTaskQueue.createJob({}).save();
  ScrapCDCTaskQueue.createJob({}).save();
}

main();
