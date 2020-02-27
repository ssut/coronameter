import axios from 'axios';
import cheerio from 'cheerio';
import { DateTime } from 'luxon';

export default async function () {
  const $main = await axios.get('https://www.jeonnam.go.kr/').then(resp => cheerio.load(resp.data));
  const target = $main('img[alt^="지역사회 총력"]').next().find('[href^="/"]').attr('href');

  const $ = await axios.get('https://www.jeonnam.go.kr' + target).then(resp => cheerio.load(resp.data));
  const stats = $('div.status_table').text().replace(/\s{1,}/g, ' ');

  const updatedAt = $('#container > article > section > div.contents > section > div.bbs_view_contnet > div.wrap > div > div.progress_w > div.title > p').text().replace('오전', 'AM').replace('오후', 'PM');

  const patterns = {
    확진자: /확진자[가-힣\s]+(?<확진자>[0-9]+)명/g,
    입원환자: /격리병원 (?<격리병원>[0-9]+)명/g,
    퇴원자: /격리해제 (?<퇴원자>[0-9]+)명/g,
    사망자: /사망자 (?<사망자>[0-9]+)명/g,
    자가격리: /자가격리 (?<자가격리>[0-9]+)명/g,
  };

  const info = {
    updatedAt: DateTime.fromFormat(updatedAt, 'M월 d일 a h시 기준'),
  } as any;

  for (const [key, pattern] of Object.entries(patterns)) {
    const result = pattern.exec(stats);
    if (result === null) {
      info[key] = 0;
      continue;
    }

    info[key] = Number(result.groups?.[key]?.trim()) || 0;
  }

  return info;
}

if (require.main === module) {
  module.exports.default().then(console.info);
}

