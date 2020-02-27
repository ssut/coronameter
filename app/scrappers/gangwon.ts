import './init';
import { ICoronaStats } from './interface';
import axios from 'axios';
import cheerio from 'cheerio';
import { DateTime } from 'luxon';
import { createOCRInstance } from '../utils/ocr';
import tempy from 'tempy';
import { createReadStream, createWriteStream } from 'fs-extra';
import * as path from 'path';
import { createRequireFromPath } from 'module';
import { crop } from '../utils/imageprocessing';

export default async function () {
  const $ = await axios.get('http://www.provin.gangwon.kr/gw/portal/sub05_01?articleSeq=164918&mode=readForm&curPage=1&boardCode=BDAAEE06').then(resp => cheerio.load(resp.data));
  const imagePath = $($('p').get().find(x => $(x).text().includes('코로나19') && $(x).text().includes('강원도') && $(x).text().includes('현황'))).parent().find('img:first-child').eq(0).attr('src');
  const imageUrl = 'http://www.provin.gangwon.kr' + imagePath;

  const filename = tempy.file({ extension: path.extname(imageUrl).replace('.', '') });
  const imageResponse = await axios.get(imageUrl, {
    responseType: 'stream',
  });
  const stream = createWriteStream(filename);
  await new Promise((resolve) => {
    stream.on('close', () => resolve());
    imageResponse.data.pipe(stream);
  });

  const [감염자, 기준] = await Promise.all([
    crop(filename, 100, 265, 115, 90),
    crop(filename, 430, 225, 170, 30),
  ]);

  const ocr = createOCRInstance();
  const [감염자Text, 기준Text] = await Promise.all([
    ocr.execute(감염자, path.extname(감염자)).then(x => x.fullTextAnnotation.text),
    ocr.execute(기준, path.extname(기준)).then(x => x.fullTextAnnotation.text),
  ]);

  const { 확진자 } = /(?<확진자>[0-9]{1,})명/g.exec(감염자Text).groups;
  const {
    year,
    month,
    day,
    hour,
  } = /(?<year>[0-9]{4}).\s(?<month>[0-9]{1,2}).\s(?<day>[0-9]{1,2}). (?<hour>[0-9]{1,2})시/g.exec(기준Text).groups;

  return {
    확진자: Number(확진자),
    입원환자: NaN,
    퇴원자: NaN,
    사망자: NaN,
    자가격리: NaN,
    updatedAt: DateTime.local().set({
      year: Number(year),
      month: Number(month),
      day: Number(day),
      hour: Number(hour),
      minute: 0,
      second: 0,
      millisecond: 0,
    }),
  } as ICoronaStats;
}

if (require.main === module) {
  module.exports.default().then(console.info);
}
