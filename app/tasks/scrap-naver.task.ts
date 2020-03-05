import { CDCInfo } from './../models/cdc-info';
import { CDCStat } from './../models/cdc-stat';
import { scrap질병관리본부, scrap네이버, scrap네이버뉴스 } from '../scrappers';
import { promises } from 'dns';

export default async function scrapCDC() {
  const stats = await scrap네이버();

  await CDCInfo.tryUpdateNaver(stats);

  const newsResults = await await scrap네이버뉴스();
  const latest = await CDCInfo.getSummary('대한민국');
  if (latest.fatality < newsResults?.[0].death && (newsResults?.[0].death - latest.fatality) < 500) {
    await latest.update('fatality', newsResults[0].death);
  }

  console.info('cdc scrapper done');
}
