import './init';
import { ICoronaStats } from './interface';
import axios from 'axios';
import cheerio from 'cheerio';
import { DateTime } from 'luxon';
import { createOCRInstance } from '../utils/ocr';
import { URL } from 'url';
import tempy from 'tempy';
import { createReadStream, createWriteStream } from 'fs-extra';
import * as path from 'path';
import { createRequireFromPath } from 'module';
import { crop } from '../utils/imageprocessing';
import * as repl from 'repl';
import * as qs from 'qs';
import * as fs from 'fs';
import * as vm from 'vm';
import * as hwp from 'node-hwp';
import parser from 'fast-xml-parser';

const vmContext = vm.createContext({
  encoding(filename) {
    return filename;
  },
});

export default async function () {
  const mainPage = await axios.get('http://www.chungnam.go.kr');
  const onClick = cheerio.load(mainPage.data)('[onclick^="encoding"]').attr('onclick');
  const filename = vm.runInContext(onClick.split(';', 1)[0], vmContext);

  const payload = qs.stringify({
    filename,
  });
  const page = await axios.get(`http://www.chungnam.go.kr/viewerUtil.do?${payload}`, {
    maxRedirects: 10,
  });
  const fn = new URL(page.config.url).searchParams.get('fn');
  const page1Url = `http://www.chungnam.go.kr/resulta/${fn}.files/1.xhtml`;

  const referer = page.config.url;
  const page1 = await axios.get(page1Url, { headers: { referer } }).then(resp => resp.data);
  const $ = cheerio.load(page1);

  const rows = $('div.page1 table#table_2 tbody tr').get().map((tr) => $(tr).find('td').get().map(td => $(td).text().trim()));
  const statRows = rows.splice(rows.findIndex(row => row[0] === '충남'));
  const accumRows = statRows.find(row => row[0] === '누계');

  const textContiansUpdatedAt = rows[0][rows[0].length - 1];
  const {
    year,
    month,
    day,
    hour,
    minute,
  } = /(?<year>[0-9]{2,4}).(?<month>[0-9]{1,2}).(?<day>[0-9]{1,2}).\s?(?<hour>[0-9]{1,2}):(?<minute>[0-9]{1,2})/g.exec(textContiansUpdatedAt).groups;
  const updatedAt = DateTime.local().set({
    year: Number(year.length === 2 ? `20${year}` : year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: 0,
    millisecond: 0,
  });

  return {
    확진자: Number(accumRows[1].replace(/[^0-9]/g, '')),
    입원환자: NaN,
    퇴원자: NaN,
    사망자: NaN,
    자가격리: Number(/자가격리 (?<자가격리>[0-9,]+)명/g.exec(accumRows[accumRows.length - 1]).groups.자가격리.replace(/[^0-9]/g, '')),
    updatedAt,
  } as ICoronaStats;
}

if (require.main === module) {
  module.exports.default().then(console.info);
}
