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
  const imagePath = $($('div').get().find(div => $(div).text() === '내용')).next().find('img:first-child').attr('src');
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

  const ocr = createOCRInstance();
  const fullOcrResult = await ocr.execute(filename ,path.extname(filename));

  const 기준Annotation = fullOcrResult.textAnnotations.find(({ description }) => description === '기준');
  const 기준BoundingRect = ocr.extractBoundingRect(기준Annotation);

  const 감염자Annotation = fullOcrResult.textAnnotations.find(({ description }) => description === '감염자');
  const 감염자BoundingRect = ocr.extractBoundingRect(감염자Annotation);

  console.info(감염자BoundingRect);

  const [감염자, 기준] = await Promise.all([
    crop(filename, 감염자BoundingRect.x - 20, 감염자BoundingRect.y - 80, 감염자BoundingRect.width + 80, 80),
    crop(filename, 기준BoundingRect.x - 175, 기준BoundingRect.y - 10, 210, 45),
  ]);
  console.info(감염자, 기준);

  const [감염자Text, 기준Text] = await Promise.all([
    ocr.execute(감염자, path.extname(감염자)).then(x => x.fullTextAnnotation.text),
    ocr.execute(기준, path.extname(기준)).then(x => x.fullTextAnnotation.text),
  ]);
  console.info(감염자Text, 기준Text);

  const { 확진자 } = /(?<확진자>[0-9]{1,})\s?명?/g.exec(감염자Text).groups;
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
