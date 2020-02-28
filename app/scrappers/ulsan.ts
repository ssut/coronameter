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
  const $ = await axios.get('http://www.ulsan.go.kr/corona.jsp').then(resp => cheerio.load(resp.data));

  const updatedAtText = $('span.co_day').text().trim().replace(/(\&nbsp;|\s){1,}/g, ' ');
  const { month, day, hour } = /(?<month>[0-9]{1,2})월\s?(?<day>[0-9]{1,2})일\s?(\([가-힣]\))?\s?(?<hour>[0-9]{1,2})시/g.exec(updatedAtText).groups;
  const updatedAt = DateTime.local().set({
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: 0,
    second: 0,
    millisecond: 0,
  });

  return {
    확진자: Number($('#patients2 > tbody > tr > td:nth-child(1) strong').text().replace(/[^0-9]/g, '')),
    입원환자: NaN,
    퇴원자: NaN,
    사망자: NaN,
    자가격리: Number($('#patients2 > tbody > tr > td:nth-child(3) strong').text().replace(/[^0-9]/g, '')),
    updatedAt,
  } as ICoronaStats;
}

if (require.main === module) {
  module.exports.default().then(console.info);
}
