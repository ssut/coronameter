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
import { Severity, withScope, captureEvent } from '@sentry/node';
import 질병관리본부 from './cdc';
import 네이버 from './naver';
import 네이버뉴스 from './naver-news';

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
  const results = Object.fromEntries(
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

  for (const [province, stat] of Object.entries(results)) {
    let reason = '';
    let level = Severity.Error;
    const fingerprints = ['SCRAP'];

    if (!stat) {
      reason = '응답 결과 없음';
      fingerprints.push('NO_RESPONSE');
    } else if (!stat.updatedAt || !stat.updatedAt.isValid) {
      reason = '날짜 정보 없음';
      fingerprints.push('NO_UPDATED_AT');
    } else if (isNaN(stat.확진자)) {
      reason = '확진자수가 숫자가 아님';
      fingerprints.push('CONFIRMED_IS_NAN');
    } else if (Math.abs(stat.updatedAt.diffNow('day').days) >= 2) {
      reason = '결과 날짜가 2일 이상 차이남';
      fingerprints.push('OLD_INFO');
    }

    if (reason) {
      withScope((scope) => {
        scope.setFingerprint(fingerprints);
        scope.setTag('province', province);

        captureEvent({
          message: `${province}: ${reason}`,
          level,
        });
      });
    }
  }

  return results;
};

export {
  질병관리본부 as scrap질병관리본부,
  네이버 as scrap네이버,
  네이버뉴스 as scrap네이버뉴스,
};

if (require.main === module) {
  (async () => {
    const coronaStats = await scrapAll();

    const tabularData = [] as any[];

    console.info(Object.values(coronaStats).reduce((accum, current) => accum + (current?.확진자 || 0), 0));

    for (const [province, stat] of Object.entries(coronaStats).sort(([, aStat], [, bStat]) => bStat.확진자 - aStat.확진자)) {
      tabularData.push({
        province,
        확진자: stat?.확진자,
        사망자: stat?.사망자,
        퇴원: stat?.퇴원자,
        음성: stat?.음성,
        격리: stat?.자가격리,

        기준: stat?.updatedAt.toFormat('MM.dd HH:mm'),
      });
    }

    console.table(tabularData);

  })();
}
