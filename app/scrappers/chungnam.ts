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
  const statPage = await axios.get('http://www.chungnam.go.kr/coronaStatus.do?tab=1').then(resp => resp.data);
  const $ = cheerio.load(statPage);

  const textContiansUpdatedAt = $('.new_tbl_board').prev('p').text();
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

  const rows = $('.new_tbl_board').eq(0).find('tr').get().map(tr => $(tr).find('td').get().map(td => $(td).text().trim()));
  const targetRow = rows.find(([cell]) => cell === '누계');

  return {
    확진자: Number(targetRow[1].replace(/[^0-9]/g, '')),
    입원환자: NaN,
    퇴원자: NaN,
    사망자: NaN,
    검사중: Number(targetRow[6].replace(/[^0-9]/g, '')),
    음성: Number(targetRow[5].replace(/[^0-9]/g, '')),
    자가격리: Number(/자가격리\s?(?<자가격리>[0-9,]+)명?/g.exec(targetRow[targetRow.length - 1]).groups.자가격리.replace(/[^0-9]/g, '')),
    updatedAt,
  } as ICoronaStats;
}

if (require.main === module) {
  module.exports.default().then(console.info);
}
