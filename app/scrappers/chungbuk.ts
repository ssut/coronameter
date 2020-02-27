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
  const $list = await axios.get('https://www.chungbuk.go.kr/www/selectBbsNttList.do?key=1560&bbsNo=3310&integrDeptCode=&searchCnd=SJ&searchKrwd=%EB%B8%8C%EB%A6%AC%ED%95%91').then(resp => cheerio.load(resp.data));
  const target = $list($list('a[href^="./selectBbsNttView"]').get().find((x: any) => $list(x).text().includes('코로나19') && $list(x).text().includes('브리핑'))).attr('href');

  const jsessionid = /jsessionid\=(?<jsessionid>[-_.a-z0-9]+)\?key/ig.exec(target).groups['jsessionid'];
  cookieJar.setCookieSync(`jsessionid=${jsessionid}`, 'www.chungbuk.go.kr', {
    secure: true,
  });
  const fixedTarget = target.replace('./', '/').replace(/;jsessionid\=([-_.a-z0-9]+)\?/ig, '?') as string;

  const $page = await axios.get('https://www.chungbuk.go.kr/www' + fixedTarget.replace('./', '/'), {
    headers: {
      referer: 'https://www.chungbuk.go.kr/www/selectBbsNttList.do?bbsNo=3310&key=1560',
    },
  }).then(resp => cheerio.load(resp.data));
  const previewTarget = $page('a[href^="./downloadBbsFile.do?"]').attr('href').replace('./', '/');

  const resp = await axios.get('https://www.chungbuk.go.kr/www' + previewTarget, {
    headers: {
      referer: 'https://www.chungbuk.go.kr/www/selectBbsNttList.do?bbsNo=3310&key=1560',
    },
    responseType: 'stream',
  });
  const filename = tempy.file({ extension: 'hwp' });
  const stream = fs.createWriteStream(filename);
  await new Promise((resolve, reject) => {
    stream.on('close', () => resolve());

    resp.data.pipe(stream);
  });

  const doc = await new Promise<any>((resolve, reject) => hwp.open(filename, (err, doc) => {
    if (err) {
      return reject(err);
    }

    return resolve(doc);
  }))

  const parsed = parser.parse(doc.toHML(), {}, false);

  const Ps = parsed.HWPML.BODY.SECTION.P as any[];
  const all = Ps.reduce((all, x) => [...all, ...Object.keys(x).flatMap(key => x[key]).filter(x => !Array.isArray(x))], []);
  const targetTable = all.filter(x => x['TABLE'] !== undefined).find(x => JSON.stringify(x).includes('확진자의 접촉자')).TABLE;
  const extractCellText = (cell: any) => String(cell.PARALIST?.P?.TEXT?.CHAR ?? '');
  const rows = targetTable.ROW as { CELL: any[] }[];
  const texts = rows.map(row => row.CELL.map(cell => extractCellText(cell))) as string[][];

  const 기준 = all.find(x => {
    const str = JSON.stringify(x);
    return str.includes('월') && str.includes('일') && str.includes('기준');
  });
  const {
    월,
    일,
    시,
    분,
  } = /(?<월>[0-9]{1,2})월 (?<일>[0-9]{1,2})일 (?<시>[0-9]{1,2}):(?<분>[0-9]{1,2})/g.exec(JSON.stringify(기준)).groups;
  const 누계 = texts.splice(texts.findIndex(text => text[0] === '누계'), 3);

  const info = {
    확진자: Number(누계[0][3]),
    입원환자: Number(누계[0][4]),
    퇴원자: Number(누계[1][3]) || 0,
    사망자: 0,
    자가격리: Number(누계[0][7]) || 0,

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
