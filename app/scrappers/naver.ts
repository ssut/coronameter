import './init';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { DateTime } from 'luxon';

export default async function () {
  await axios.get('https://m.search.naver.com');
  const $ = await axios.get('https://m.search.naver.com/search.naver?sm=mtb_hty.top&where=m&oquery=%ED%99%95%EC%A7%84&&query=%EC%BD%94%EB%A1%9C%EB%82%98').then(resp => cheerio.load(resp.data));

  const {
    year,
    month,
    day,
    hour,
    minute,
  }= /(?<year>[0-9]{4}).(?<month>[0-9]{1,2}).(?<day>[0-9]{1,2}).\s?(?<hour>[0-9]{1,2})\:(?<minute>[0-9]{1,2})\s?집계/g.exec($($('h3').get().find(h3 => $(h3).text() === '코로나바이러스감염증-19')).parent().next('.status_info').find('.status_bottom').text()).groups;
  const updatedAt = DateTime.local().set({
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: 0,
    millisecond: 0,
  });

  const data = Object.fromEntries($($('h3').get().find(h3 => $(h3).text() === '코로나바이러스감염증-19')).parent().next('.status_info').find('ul li[class^="info_"]').get().map(li => {
    const $li = $(li);
    const title = $li.find('.info_title').text().trim();
    const num = Number($li.find('.info_num').text().replace(/[^0-9]/g, ''));
    const variation = Number($li.find('.info_variation').text().replace(/[^0-9]/g, '')) || 0;

    return [title, { count: num, variation }];
  })) as {
    [key in '확진환자' | '검사진행' | '격리해제' | '사망자']: {
      count: number;
      variation: number;
    };
    };

  return {
    ...data,
    updatedAt,
  };
}

if (require.main === module) {
  module.exports.default().then(x => console.info(JSON.stringify(x, null, 2)));
}


