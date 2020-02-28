import './init';
import { ICoronaStats } from './interface';
import axios from 'axios';
import cheerio from 'cheerio';
import { DateTime } from 'luxon';
import { createOCRInstance } from '../utils/ocr';
import tempy from 'tempy';
import { createReadStream, createWriteStream, writeFileSync } from 'fs-extra';
import * as path from 'path';
import { createRequireFromPath } from 'module';
import { crop } from '../utils/imageprocessing';
import { longStackTraces } from 'bluebird';

export default async function () {
  const $ = await axios.get('https://www.gwangju.go.kr/corona/index.html').then(resp => cheerio.load(resp.data));
  const imagePath = $($('img[src^="/corona"]').get().find(x => $(x).attr('usemap'))).attr('src');
  const imageUrl = 'https://www.gwangju.go.kr' + imagePath;

  const filename = tempy.file({ extension: path.extname(imageUrl).replace('.', '') });
  const imageResponse = await axios.get(imageUrl, {
    responseType: 'stream',
    headers: {
      referer: 'https://www.gwangju.go.kr/corona/index.html',
    },
  });
  const stream = createWriteStream(filename);
  await new Promise((resolve) => {
    stream.on('close', () => resolve());
    imageResponse.data.pipe(stream);
  });

  const ocr = createOCRInstance();
  const fullOcrResult = await ocr.execute(filename ,path.extname(filename));

  const 확진환자Annotation = fullOcrResult.textAnnotations.find(({ description }) => description === '확진환자');
  const 확진자boundingRect = ocr.extractBoundingRect(확진환자Annotation);
  const 격리해제자가격리Annotation = fullOcrResult.textAnnotations.find(({ description }) => description === '격리해제');
  const 격리해제자가격리boundingRect = ocr.extractBoundingRect(격리해제자가격리Annotation);
  const 격리병원Annotation = fullOcrResult.textAnnotations.find(({ description }) => description === '격리병원');
  const 격리병원boundingRect = ocr.extractBoundingRect(격리병원Annotation);

  const [
    기준,
    확진자,
    격리해제자가격리,
    격리병원,
  ] = await Promise.all([
    crop(filename, 330, 50, 350, 60),
    crop(filename, 확진자boundingRect.x - 50, 확진자boundingRect.y + 확진자boundingRect.height + 50, 확진자boundingRect.width + 55, 70, {
      sharpen: true,
      outputFormat: 'png',
      custom: (sharp) => sharp.tint({ r: 255, g: 228, b: 0 }).grayscale().resize(Math.round((확진자boundingRect.width + 55) / 2), 35),
    }),
    crop(filename, 격리해제자가격리boundingRect.x - 20, 격리해제자가격리boundingRect.y - 10, 180, 90),
    crop(filename, 격리병원boundingRect.x - 20, 격리병원boundingRect.y - 10, 140, 50),
  ]);

  const [
    기준Text,
    확진자Text,
    격리해제자가격리Text,
    격리병원Text,
  ] = await Promise.all([
    ocr.execute(기준, path.extname(기준)).then(x => x.fullTextAnnotation?.text ?? ''),
    ocr.execute(확진자, path.extname(확진자)).then(x => x.fullTextAnnotation?.text ?? ''),
    ocr.execute(격리해제자가격리, path.extname(격리해제자가격리)).then(x => x.fullTextAnnotation?.text ?? ''),
    ocr.execute(격리병원, path.extname(격리병원)).then(x => x.fullTextAnnotation.text ?? ''),
  ]);

  const {
    month,
    day,
    hour,
  } = /(?<month>[0-9]{1,2})월\s(?<day>[0-9]{1,2})일\s(?<hour>[0-9]{1,2})시/g.exec(기준Text).groups;
  const 확진자수 = Number(/(?<확진자>[0-9]+)/g.exec(확진자Text.trim()).groups.확진자);
  const {
    격리해제,
    자가격리,
  } = /격리해제\s?(?<격리해제>[0-9]+)\s?명\s?자가격리\s?(?<자가격리>[0-9]+)\s?명/g.exec(격리해제자가격리Text.replace(/(\||\n|\s|\s)/g, '')).groups;
  const _격리병원 = Number(/격리병원\s?(?<격리병원>[0-9]+)\s?명/g.exec(격리병원Text.replace(/|/g, '')).groups.격리병원);

  return {
    확진자: 확진자수,
    입원환자: _격리병원,
    퇴원자: Number(격리해제),
    사망자: 0,
    자가격리: Number(자가격리),
    updatedAt: DateTime.local().set({
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
