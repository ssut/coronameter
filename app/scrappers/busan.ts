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
  const $ = await axios.get('http://www.busan.go.kr/corona/index.jsp').then(resp => cheerio.load(resp.data));
  const imagePath = $('div.banner a > img').attr('src');
  const imageUrl = 'http://www.busan.go.kr' + imagePath;

  const filename = tempy.file({ extension: path.extname(imageUrl).replace('.', '') });
  const imageResponse = await axios.get(imageUrl, {
    responseType: 'stream',
  });
  const stream = createWriteStream(filename);
  await new Promise((resolve) => {
    stream.on('close', () => resolve());
    imageResponse.data.pipe(stream);
  });

  const 기준 = $('div.banner img + .item1').text().trim().replace(/\([가-힣]\)/g, '').replace(/(\&nbsp;|\s)+/g, ' ');
  const updatedAt = DateTime.fromFormat(기준, 'M월 d일 H시 기준');

  const 확진자 = Number($('div.banner .item2').text().replace(/[^0-9]/g, ''));
  return {
    확진자,
    입원환자: NaN,
    퇴원자: NaN,
    사망자: NaN,
    자가격리: NaN,
    updatedAt,
  } as ICoronaStats;
}

if (require.main === module) {
  module.exports.default().then(console.info);
}
