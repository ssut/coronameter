import { ICoronaStats } from './interface';
import axios from 'axios';
import cheerio from 'cheerio';
import { DateTime } from 'luxon';

export default async function () {
  const $ = await axios.get('https://www.jeonnam.go.kr/coronaMainPage.do').then(resp => cheerio.load(resp.data));


  const updatedAt = $('.title em').text().replace('오전', 'AM').replace('오후', 'PM').replace(/\(|\)/g, '');
  const data = Object.fromEntries($('.name').get().map(x => [$(x).text().trim(), Number($(x).next('.num').text().replace(/[^0-9]/g, ''))]));

  const info = {
    updatedAt: DateTime.fromFormat(updatedAt, 'yyyy년 M월 d일 a h시'),
    확진자: data.전남,
    입원환자: NaN,
    퇴원자: NaN,
    사망자: NaN,
    음성: data['검사결과(음성)'],
    자가격리: data['감시중'],
  } as ICoronaStats;

  return info;
}

if (require.main === module) {
  module.exports.default().then(console.info);
}

