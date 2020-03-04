import { CDCInfo } from './../models/cdc-info';
import { CDCStat } from './../models/cdc-stat';
import { scrap질병관리본부 } from '../scrappers';
import { promises } from 'dns';

export default async function scrapCDC() {
  const stats = await scrap질병관리본부();

  await CDCInfo.tryUpdate(stats);
  console.info('cdc scrapper done');
}
