import { ICoronaStats } from './interface';
import axios from 'axios';
import cheerio from 'cheerio';
import { DateTime } from 'luxon';

export default async function () {
  const $ = await axios.get('http://www.gb.go.kr/Main/open_contents/section/wel/page.do?mnu_uid=5760&LARGE_CODE=360&MEDIUM_CODE=10&SMALL_CODE=50&SMALL_CODE2=60mnu_order=2').then(resp => cheerio.load(resp.data));
  const 경상북도현황 = $($('h4').get().find(x => $(x).text().includes('경상북도 현황')));

  const statText = 경상북도현황.text();

  const {
    month,
    day,
    hour,
    minute,
  } =  /\'(?<year>[0-9]{1,4}).(?<month>[0-9]{1,2}).(?<day>[0-9]{1,2}). (?<hour>[0-9]{1,2})\:(?<minute>[0-9]{1,2})/g.exec(statText).groups;
  const updatedAt = DateTime.local().set({
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: 0,
    millisecond: 0,
  });

  const table = 경상북도현황.next().next().find('table');
  const tds = table.find('tbody tr:first-child td');

  return {
    확진자: Number(tds.eq(1).text().trim().replace(/[^0-9]/g, '')),
    입원환자: Number(tds.eq(2).text().trim().replace(/[^0-9]/g, '')),
    퇴원자: Number(tds.eq(3).text().trim().replace(/[^0-9]/g, '')),
    사망자: Number(tds.eq(4).text().trim().replace(/[^0-9]/g, '')),
    자가격리: Number(tds.eq(9).text().trim().replace(/[^0-9]/g, '')),
    updatedAt,
  } as ICoronaStats;
}

if (require.main === module) {
  module.exports.default().then(console.info);
}
