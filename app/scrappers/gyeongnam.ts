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
  const resp = await axios.get('http://www.gyeongnam.go.kr/board/list.gyeong?boardId=BBS_0000539&menuCd=DOM_000000111007007001&contentsSid=4177&cpath=', {
    headers: {
      referer: 'http://www.gyeongnam.go.kr/index.gyeong?menuCd=DOM_000000111007007009',
      'user-agent': 'ozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.116 Safari/537.36',
      accept: '*/*',
    },
    maxRedirects: 10,
  });
  const $list = cheerio.load(resp.data);
  const targetLink = $list('table.basicList a[href^="/board"]').eq(0).attr('href');
  const articlePage = await axios.get('http://www.gyeongnam.go.kr' + targetLink, {
    headers: {
      referer: 'http://www.gyeongnam.go.kr/index.gyeong?menuCd=DOM_000000111007007009',
      'user-agent': 'ozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.116 Safari/537.36',
      accept: '*/*',
    },
  });
  const $ = cheerio.load(articlePage.data);
  const hwpLink = 'http://www.gyeongnam.go.kr' + $('a[href*="download.gyeong"][title*="hwp"]').attr('href');

  const hwpResponse = await axios.get(hwpLink, {
    headers: {
      referer: articlePage.config.url,
    },
    responseType: 'stream',
  });
  const filename = tempy.file({ extension: 'hwp' });
  const stream = fs.createWriteStream(filename);
  await new Promise((resolve, reject) => {
    stream.on('close', () => resolve());

    hwpResponse.data.pipe(stream);
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
  const targetTable = all.filter(x => x['TABLE'] !== undefined).find(x => JSON.stringify(x).includes('자가격리자')).TABLE;
  const extractCellText = (cell: any) => String(cell.PARALIST?.P?.TEXT?.CHAR ?? '');
  const rows = targetTable.ROW as { CELL: any[] }[];
  const texts = rows.map(row => row.CELL.map(cell => extractCellText(cell))) as string[][];

  const updatedAtText = all.find((x, index) => all.slice(index).find(x => x.TABLE === targetTable) && JSON.stringify(x?.CHAR ?? '').includes('기준'))?.CHAR ?? '';
  const {
    월,
    일,
    시,
    분,
  } = /(?<월>[0-9]{1,2}). (?<일>[0-9]{1,2}). (?<시>[0-9]{1,2}):(?<분>[0-9]{1,2})\s?기준/g.exec(JSON.stringify(updatedAtText)).groups;
  const updatedAt = DateTime.local().set({
    month: Number(월),
    day: Number(일),
    hour: Number(시),
    minute: Number(분),
    second: 0,
    millisecond: 0,
  });

  return {
    확진자: Number(texts[texts.length - 1][1]),
    자가격리: Number(texts[texts.length - 1][4]),
    입원환자: NaN,
    퇴원자: NaN,
    사망자: 0,
    updatedAt,
  } as ICoronaStats;
}

if (require.main === module) {
  module.exports.default().then(console.info);
}
