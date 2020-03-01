import { ICoronaStats } from './interface';
import './init';
import { cookieJar } from './init';

import axios from 'axios';
import cheerio from 'cheerio';
import * as hwp from 'node-hwp';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import tempy from 'tempy';
import { rejects } from 'assert';
import parser from 'fast-xml-parser';
import repl from 'repl';
import { DateTime } from 'luxon';

export default async function () {
  const $ = await axios.get('http://www.gyeongnam.go.kr/corona.html').then(resp => cheerio.load(resp.data));
  const data = Object.fromEntries($('.d_tit').get().map(title => [$(title).text().trim(), $(title).next('.dt').text().trim().replace(/,/g, '').replace(/\s+/g, ' ')]));

  const updatedAtText = $('.time').text().trim().replace(/\(|\)/g, '');
  const updatedAt = DateTime.fromFormat(updatedAtText, 'yyyy.MM.dd. HH시 기준');

  const 확진자 = Number(data.확진환자.split('명', 1)[0]);
  const 퇴원자 = Number(data.확진환자.split('완치')[1].replace(/[^0-9]/g, ''));
  const 자가격리 = Number(data.자가격리자.replace(/[^0-9]/g, ''));

  return {
    확진자,
    자가격리,
    입원환자: NaN,
    퇴원자,
    사망자: 0,
    updatedAt,
  } as ICoronaStats;
}

if (require.main === module) {
  module.exports.default().then(console.info);
}
