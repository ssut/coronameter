import { ICoronaStats } from './interface';
import axios from 'axios';
import cheerio from 'cheerio';
import { DateTime } from 'luxon';

export default async function () {
  const $ = await axios.get('http://www.daegu.go.kr/').then(resp => cheerio.load(resp.data));

  const spans = $('span').get().map(x => ({ element: $(x), text: $(x).text().trim() }));

  const updatedAtText = $('div.count p.date').text().trim();

  const mmdd = updatedAtText.split('(', 1)[0];
  const hhmm = updatedAtText.split(')')[1];
  return {
    확진자: Number(spans.find(({ text }) => text === '총계').element.next().text().replace(/[^0-9]/g, '')),
    입원환자: Number(spans.find(({ text }) => text === '격리중').element.next().text().replace(/[^0-9]/g, '')),
    퇴원자: Number(spans.find(({ text }) => text === '격리해제').element.next().text().replace(/[^0-9]/g, '')),
    사망자: Number(spans.find(({ text }) => text === '사망').element.next().text().replace(/[^0-9]/g, '')),
    자가격리: NaN,
    updatedAt: DateTime.fromFormat(mmdd + hhmm, 'yyyy.M.d hh:mm기준'),
  } as ICoronaStats;
}

if (require.main === module) {
  module.exports.default().then(console.info);
}
