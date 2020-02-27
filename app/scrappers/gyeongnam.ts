import './init';
import { ICoronaStats } from './interface';
import axios from 'axios';
import cheerio from 'cheerio';
import { DateTime } from 'luxon';
import { fstat, writeFileSync } from 'fs';

export default async function () {
  const resp = await axios.get('http://www.gyeongnam.go.kr/index.gyeong?menuCd=DOM_000000111007007013', {
    headers: {
      referer: 'http://www.gyeongnam.go.kr/index.gyeong?menuCd=DOM_000000111007007009',
      'user-agent': 'ozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.116 Safari/537.36',
      accept: '*/*',
    },
    maxRedirects: 10,
  });
  const $ = cheerio.load(resp.data);
  const updatedAt = $('#subCnt > div.co_situ > div.co_tit > p.time').text();

  return {
    확진자: Number($('#subCnt > div.co_situ > div.co_data > div > ul.line.line00 > li:nth-child(4) > span').text().replace(/[^0-9]/g, '')),
    자가격리: Number($('#subCnt > div.co_situ > div.co_data > ul > li.dt.data_1 > span').text().replace(/[^0-9]/g, '')),
    입원환자: NaN,
    퇴원자: NaN,
    사망자: 0,
    updatedAt: DateTime.fromFormat(updatedAt, '(yyyy.MM.dd. HH시 기준)'),
  } as ICoronaStats;
}

if (require.main === module) {
  module.exports.default().then(console.info);
}
