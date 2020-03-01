import './init';

import axios from 'axios';
import cheerio from 'cheerio';
import { DateTime } from 'luxon';

import { ICoronaStats } from './interface';

export default async function () {
  const resp = await axios.get('https://www.incheon.go.kr/health/HE020409', {
    headers: {
      accept: '*/*',
    },
  });
  const $ = cheerio.load(resp.data);

  const 확진자 = Number(($('table td').get().map(td => [$(td), $(td).text().trim()]).find(([, text]) => text === '인천')[0] as any).next().text().trim());
  const 제공일 = $('.tbl-unit').text().trim().replace(/[^0-9.]/g, '');

  const { month, day } = /(?<month>[0-9]{1,2}).\s?(?<day>[0-9]{1,2})./g.exec(제공일).groups;
  const updatedAt = DateTime.local().set({
    month: Number(month),
    day: Number(day),
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
  });

  return {
    확진자,
    입원환자: NaN,
    퇴원자: NaN,
    사망자: NaN,
    자가격리: NaN,
    updatedAt,
  } as ICoronaStats;
}

if (require.main === module) {
  module.exports.default().then(console.info);
}
