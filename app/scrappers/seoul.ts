import { ICoronaStats } from './interface';
import axios from 'axios';
import cheerio from 'cheerio';
import { DateTime } from 'luxon';

export default async function () {
  const $ = await axios.get('http://www.seoul.go.kr/coronaV/coronaStatus.do').then(resp => cheerio.load(resp.data));
  const updatedAt = $('.status-seoul > h4 span').text().replace(/(\(|\)|')/g, '');

  return {
    확진자: Number($('#tab-cont1 > div > div.status > div.status-seoul > div.cell.cell1 > div > p.counter').text()),
    자가격리: Number($('#tab-cont1 > div > div.status > div.status-seoul > div.cell.cell3 > div.num.num5 > p.counter').text().trim()),
    입원환자: NaN,
    퇴원자: NaN,
    사망자: 0,
    updatedAt: DateTime.fromFormat(updatedAt, 'yy.MM.dd.HH시 기준'),
  } as ICoronaStats;
}

if (require.main === module) {
  module.exports.default().then(console.info);
}

