import { ScrapTaskQueue } from './queue';
import { redis, initialize } from './common';
import * as tasks from './tasks';

const CronJob = require('cron-cluster')(redis).CronJob;

async function main() {
  await initialize();

  ScrapTaskQueue.process(tasks.scrap);

  const job = new CronJob({
    cronTime: '0 * * * *',
    onTick() {
      ScrapTaskQueue.createJob({}).save();
    },
  });
  job.start();

      ScrapTaskQueue.createJob({}).save();
}

main();
