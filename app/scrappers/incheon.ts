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

  const 확진자 = Number(/누계 확진자\s:\s(?<확진자>[0-9]+)명/.exec(resp.data).groups.확진자);
  const 제공일 = $('#content > div.content-body > div > article > div > div.article-content > section > div.section4-body > div > div.tbl-head > span').text().trim().replace(/(\&nbsp;|\s){1,}/g, ' ');

  const { month, day } = /(?<month>[0-9]{1,2}). (?<day>[0-9]{1,2})./g.exec(제공일).groups;
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
