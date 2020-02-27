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
import Tesseract, {  createWorker } from 'tesseract.js';
import { longStackTraces } from 'bluebird';

export default async function () {
  const $ = await axios.get('https://www.gwangju.go.kr/corona/index.html').then(resp => cheerio.load(resp.data));
  const imagePath = $($('img[src^="/corona"]').get().find(x => $(x).attr('src').includes('img.jpg'))).attr('src');
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

  const [
    기준,
    확진자,
    격리해제자가격리,
    격리병원,
  ] = await Promise.all([
    crop(filename, 330, 50, 350, 60),
    crop(filename, 255, 310, 150, 85, 100, 0.5),
    crop(filename, 330, 400, 155, 75, 100),
    crop(filename, 170, 415, 140, 50),
  ]);

  console.info(확진자, 기준);

  const ocr = createOCRInstance();
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
