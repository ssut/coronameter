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

export default async function () {
  const $list = await axios.get('https://www.chungbuk.go.kr/www/selectBbsNttList.do?bbsNo=3310&key=1560').then(resp => cheerio.load(resp.data));
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

  const targetTable = parsed.HWPML.BODY.SECTION.P.reduce((all, x) => [...all, ...Object.keys(x).flatMap(key => x[key]).filter(x => !Array.isArray(x))], []).filter(x => x['TABLE'] !== undefined).find(x => JSON.stringify(x).includes('확진자의 접촉자')).TABLE;
  const extractCellText = (cell: any) => String(cell.PARALIST?.P?.TEXT?.CHAR ?? '');
  const rows = targetTable.ROW as { CELL: any[] }[];
  const texts = rows.map(row => row.CELL.map(cell => extractCellText(cell))) as string[][];

  const 누계 = texts.splice(texts.findIndex(text => text[0] === '누계'), 3);

  const info = {
    확진자: Number(누계[0][3]),
    입원환자: Number(누계[0][4]),
    퇴원자: Number(누계[1][3]) || 0,
    사망자: 0,
    자가격리: Number(누계[0][7]) || 0,
  } as ICoronaStats;

  return info;
}

if (require.main === module) {
  module.exports.default().then(console.info);
}
