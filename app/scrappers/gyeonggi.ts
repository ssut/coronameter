import { ICoronaStats } from './interface';
import axios from 'axios';
import cheerio from 'cheerio';
import { DateTime } from 'luxon';

export default async function () {
  const resp = await axios.get('https://www.gg.go.kr/bbs/boardView.do?bsIdx=464&bIdx=2296956&menuId=1535');
  const $ = cheerio.load(resp.data);

  const updatedAt = $('.updateDate').text().trim().replace(/[^0-9.]/g, '');

  return {
    확진자: Number($('#quick3 div.dashBoard ul.column-4 li').eq(3).children('strong').text()),
    입원환자: Number($('#quick3 div.dashBoard ul.column-4 li').eq(0).children('strong').text()),
    퇴원자: Number($('#quick3 div.dashBoard ul.column-4 li').eq(1).children('strong').text()),
    사망자: Number($('#quick3 div.dashBoard ul.column-4 li').eq(2).children('strong').text()),

    // 2020.2.27 AM 9:00
    updatedAt: DateTime.fromFormat(updatedAt, 'yyyy.M.d.hh'),
  } as ICoronaStats;
}

if (require.main === module) {
  module.exports.default().then(console.info);
}
