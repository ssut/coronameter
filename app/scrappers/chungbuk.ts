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
  const $ = await axios.get('http://www.chungbuk.go.kr/www/covid-19/index.html').then(resp => cheerio.load(resp.data));

  const 기준 = $('.timebox').text().trim();
  const {
    월,
    일,
    시,
    분,
  } = /(?<월>[0-9]{1,2})월\s+?(?<일>[0-9]{1,2})일\s?(\([가-힣]\))?\s?(?<시>[0-9]{1,2}):(?<분>[0-9]{1,2})/g.exec(JSON.stringify(기준)).groups;

  const data = Object.fromEntries($('.rowbox1 div.title').get().map(title => [$(title).text().trim(), Number($(title).prev('.text').text().replace(/[^0-9]/g, ''))]));

  const info = {
    확진자: data.확진자,
    입원환자: NaN,
    퇴원자: NaN,
    사망자: 0,
    검사중: data.검사중,
    음성: data['검사결과(음성)'],
    자가격리: data.자가격리자,

    updatedAt: DateTime.local().set({
      month: Number(월),
      day: Number(일),
      hour: Number(시),
      minute: Number(분),
      second: 0,
      millisecond: 0,
    }),
  } as ICoronaStats;

  return info;
}

if (require.main === module) {
  module.exports.default().then(console.info);
}
