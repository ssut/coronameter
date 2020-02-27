import { ICoronaStats } from './interface';
import axios from 'axios';
import cheerio from 'cheerio';
import { DateTime } from 'luxon';

export default async function () {
  const resp = await axios.get('https://www.gg.go.kr/bbs/boardView.do?bsIdx=464&bIdx=2296956&menuId=1535');
  const $ = cheerio.load(resp.data);

  const updatedAt = $('#quick3 > div > div.dashBoard > div > div:nth-child(2)').text().trim().split(' : ').reverse()[0].trim().replace('오전', 'AM').replace('오후', 'PM');

  return {
    확진자: Number($('#quick3 > div > div.dashBoard > div > ul:nth-child(3) > li:nth-child(4) > strong').text()),
    입원환자: Number($('#quick3 > div > div.dashBoard > div > ul:nth-child(3) > li:nth-child(1) > strong').text()),
    퇴원자: Number($('#quick3 > div > div.dashBoard > div > ul:nth-child(3) > li:nth-child(2) > strong').text()),
    사망자: Number($('#quick3 > div > div.dashBoard > div > ul:nth-child(3) > li:nth-child(3) > strong').text()),

    // 2020.2.27 AM 9:00
    updatedAt: DateTime.fromFormat(updatedAt, 'yyyy.M.d. a h:mm'),
  } as ICoronaStats;
}

if (require.main === module) {
  module.exports.default().then(console.info);
}
