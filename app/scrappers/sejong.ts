import { ICoronaStats } from './interface';
import axios from 'axios';
import cheerio from 'cheerio';
import { DateTime } from 'luxon';

export default async function () {
  const [data] = await axios.get('https://www.sejong.go.kr/prog/fluInfo/listAjax.do').then(resp => resp.data);

  const {
    month,
    day,
    hour,
  } =/(?<month>[0-9]{1,2})월 (?<day>[0-9]{1,2})일\s?\([가-힣]\)\s?(?<hour>[0-9]{1,2})시 기준/g.exec(data.baseDate).groups;
  const updatedAt = DateTime.local().set({
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: 0,
    second: 0,
    millisecond: 0,
  });

  return {
    확진자: Number(data.info1),
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
