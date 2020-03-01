import { CDCStat } from './../models/cdc-stat';
import { scrap질병관리본부 } from '../scrappers';
import { promises } from 'dns';

export default async function scrapCDC() {
  const stats = await scrap질병관리본부();
  console.info(stats);

  const promises = [] as any[];
  for (const [province, stat] of Object.entries(stats)) {
    promises.push(CDCStat.updateStats(province, stat));
  }

  await Promise.all(promises);
  console.info('cdc scrapper done');
}
