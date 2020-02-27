import { ICoronaStats } from './interface';
import axios from 'axios';
import cheerio from 'cheerio';
import { DateTime } from 'luxon';

export default async function () {
  const $ = await axios.get('https://www.daejeon.go.kr/corona19/index.do').then(resp => cheerio.load(resp.data));
  const updatedAt = $('#contBox > h3:nth-child(1) > span').text();

  return {
    확진자: Number($('#contBox > div:nth-child(2) > div > ul > li.tab-1 > div.txt > strong').text()),
    입원환자: NaN,
    퇴원자: NaN,
    자가격리: Number($('#contBox > div:nth-child(2) > div > ul > li:nth-child(3) > div.txt > span:nth-child(3) > strong').text()),
    사망자: Number($('#contBox > div:nth-child(2) > div > ul > li.tab-3 > div.txt > strong').text()),

    updatedAt: DateTime.fromFormat(updatedAt, 'yy. M. d. H시 기준'),
  } as ICoronaStats;
}

if (require.main === module) {
  module.exports.default().then(console.info);
}
