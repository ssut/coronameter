import { ICoronaStats } from './interface';
import axios from 'axios';
import cheerio from 'cheerio';
import { DateTime } from 'luxon';

export default async function () {
  const $list = await axios.get('https://www.sejong.go.kr/bbs/R3273/list.do?mno=sub05_0703').then(resp => cheerio.load(resp.data));
  const target = $list($list('a[href^="/bbs/"]').get().find(x => $list(x).text().includes('코로나19') && $list(x).text().includes('일일 동향'))).attr('href');

  const $ = await axios.get('https://www.sejong.go.kr' + target).then(resp => cheerio.load(resp.data));

  const 관리대상자현황 = $($('span').get().find(span => $(span).text().includes('관리 대상자 현황')));
  const parent = 관리대상자현황.parent().text();
  const {
    month,
    day,
    hour,
    minute,
  } =/(?<month>[0-9]{1,2})월 (?<day>[0-9]{1,2})일, (?<hour>[0-9]{1,2}):(?<minute>[0-9]{1,2})/g.exec(parent).groups;

  const updatedAt = DateTime.local().set({
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: 0,
    millisecond: 0,
  });

  const table = 관리대상자현황.parent().next().find('table');
  const rows = table.find('tbody tr');

  return {
    확진자: Number(rows.eq(1).find('td').eq(4).text().replace(/[\s명]/g, '')),
    입원환자: NaN,
    퇴원자: NaN,
    사망자: NaN,
    자가격리: Number(rows.eq(2).find('td').eq(4).text().replace(/[\s명]/g, '')) + Number(rows.eq(3).find('td').eq(4).text().replace(/[\s명]/g, '')),
    updatedAt,
  } as ICoronaStats;
}

if (require.main === module) {
  module.exports.default().then(console.info);
}
