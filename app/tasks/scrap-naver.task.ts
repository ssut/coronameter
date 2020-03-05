import { CDCInfo } from './../models/cdc-info';
import { CDCStat } from './../models/cdc-stat';
import { scrap질병관리본부, scrap네이버 } from '../scrappers';
import { promises } from 'dns';

export default async function scrapCDC() {
  const stats = await scrap네이버();

  await CDCInfo.tryUpdateNaver(stats);
  console.info('cdc scrapper done');
}
