import { ICoronaStats } from './interface';
import bluebird from 'bluebird';
import debug from 'debug';

import 경기도 from './gyeonggi';
import 전라북도 from './jeonbuk';
import 전라남도 from './jeonnam';
import 충청북도 from './chungbuk';
import 대전광역시 from './daejeon';
import 제주특별자치도 from './jeju';
import 서울특별시 from './seoul';
import 대구광역시 from './daegu';
import 세종특별자치시 from './sejong';
import 경상북도 from './gyeongbuk';
import 경상남도 from './gyeongnam';
import 강원도 from './gangwon';
import 부산광역시 from './busan';
import 인천광역시 from './incheon';
import 광주광역시 from './gwangju';
import 충청남도 from './chungnam';
import 울산광역시 from './ulsan';

const logger = debug('scrappers');

const scrappers = {
  서울특별시,
  부산광역시,
  대구광역시,
  인천광역시,
  광주광역시,
  대전광역시,
  세종특별자치시,
  경기도,
  강원도,
  충청남도,
  충청북도,
  전라남도,
  전라북도,
  경상남도,
  경상북도,
  울산광역시,
  제주특별자치도,
};

export default scrappers;

export const scrapAll = async (concurrency = 5) => {
  return Object.fromEntries(
    await bluebird.map(Object.entries(scrappers), async ([province, fn]) => {
      const logger = debug(`scrapper:${province}`);

      logger('processing...');
      const result = await bluebird.props([province, fn()]).catch((err) => {
        console.info(err);
        return [province, null];
      });
      logger('OK');
      return result;
    }, { concurrency }),
  ) as {
    [key in keyof typeof scrappers]: ICoronaStats;
  };
};

if (require.main === module) {
  (async () => {
    const coronaStats = await scrapAll();
    console.info(Object.values(coronaStats).reduce((accum, current) => accum + (current?.확진자 || 0), 0));
    console.info(Object.entries(coronaStats).map(([province, stats]) => `${province}: ${stats?.확진자} (${stats?.updatedAt.toFormat('MM.dd HH:mm 기준')})`).join('\n'));

  })();
}
