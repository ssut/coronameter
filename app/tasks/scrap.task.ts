import { scrapAll } from '../scrappers';
import { Stat } from '../models';

export default async function scrap() {
  const stats = await scrapAll();
  console.info(stats);

  const promises = [] as any[];
  for (const [province, stat] of Object.entries(stats)) {
    promises.push(Stat.updateStats(province, stat));
  }

  await Promise.all(promises);
  console.info('scrapper done');
}
