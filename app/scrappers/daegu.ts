import { ICoronaStats } from './interface';
import axios from 'axios';
import cheerio from 'cheerio';
import { DateTime } from 'luxon';

export default async function () {
  const $ = await axios.get('http://www.daegu.go.kr/').then(resp => cheerio.load(resp.data));

  const updatedAt = $('body > div > div.section03.count > div.con_l > p > span').text().trim();
  const mmdd = updatedAt.split('(', 1)[0];
  const hhmm = updatedAt.split(', ')[1];
  return {
    확진자: Number($('body > div > div.section03.count > div.con_r > ul > li.confirm > strong').text().replace(/[^0-9]/g, '')),
    입원환자: NaN,
    퇴원자: NaN,
    사망자: Number($('body > div > div.section03.count > div.con_r > ul > li:nth-child(4) > strong').text().replace(/[^0-9]/g, '')),
    자가격리: NaN,
    updatedAt: DateTime.fromFormat(mmdd + ' ' + hhmm, 'M.d hh:mm기준'),
  } as ICoronaStats;
}

if (require.main === module) {
  module.exports.default().then(console.info);
}
