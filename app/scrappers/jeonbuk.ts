import { ICoronaStats } from './interface';
import axios from 'axios';
import cheerio from 'cheerio';
import { DateTime } from 'luxon';

export default async function () {
  const resp = await axios.get('http://www.jeonbuk.go.kr/index.jeonbuk');
  const $ = cheerio.load(resp.data);

  const stats = $('.tb_ul > li').text().replace(/[ \r\n\t]{1,}/g, ' ');
  const updatedAt = $('div.tb_m > p').text().trim().replace(/\s/g, '');

  const patterns = {
    확진자: /확진자 (?<확진자>[0-9]+)명/g,
    입원환자: /격리 (?<입원환자>[0-9]+)명/g,
    퇴원자: /완치 (?<퇴원자>[0-9]+)명/g,
    사망자: /사망자 (?<사망자>[0-9]+)명/g,
    자가격리: /자가격리 (?<자가격리>[0-9]+)명/g,
  };

  const info = {
    updatedAt: DateTime.fromFormat(updatedAt, 'yyyy.M.d.hh:mm'),
  } as any;

  for (const [key, pattern] of Object.entries(patterns)) {
    const result = pattern.exec(stats);
    if (result === null) {
      info[key] = 0;
      continue;
    }

    info[key] = Number(result.groups?.[key].trim()) || 0;
  }

  return info;
}

if (require.main === module) {
  module.exports.default().then(console.info);
}
