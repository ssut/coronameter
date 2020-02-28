import './init';

import axios from 'axios';
import cheerio from 'cheerio';
import { DateTime } from 'luxon';

import { ICoronaStats } from './interface';

export default async function () {
  let $ = await axios.get('https://www.gwangju.go.kr/coronamap.jsp').then(resp => cheerio.load(resp.data));

  const gwangjuCoronaInfoText = $('#map_header > div.header_text')?.text();

  const 확진자수RegexResult = /확진환자[ ]*:[ ]([0-9]+)명/.exec(gwangjuCoronaInfoText);
  if (확진자수RegexResult === null) {
    throw new Error('Could not parse corona infected persons');
  }
  const 확진자수 = 확진자수RegexResult[1];

  const 자가격리RegexResult = /자가격리 ([0-9]+)명/.exec(gwangjuCoronaInfoText);
  if (자가격리RegexResult === null) {
    throw new Error('Could not parse corona infected persons');
  }

  const 자가격리 = 자가격리RegexResult[1];

  const 격리해제RegexResult = /격리해제 ([0-9]+)명/.exec(gwangjuCoronaInfoText);
  if (격리해제RegexResult === null) {
    throw new Error('Could not parse corona infected persons');
  }

  const 격리해제 = 격리해제RegexResult[1];


  $ = await axios.get('https://www.gwangju.go.kr').then(resp => cheerio.load(resp.data));

  const gwangjuCoronaMapDate = $('body > div:nth-child(2)').text();
  const dataResult = /2020[. ]+([0-9])+[. ]+([0-9]+)[. ]+([0-9]+):([0-9]+)[ ]+기준/.exec(gwangjuCoronaMapDate);

  if (dataResult === null) {
    throw new Error('Could not parse updated at');
  }

  const month = dataResult[1];
  const day = dataResult[2];
  const hour = dataResult[3];
  const minute = dataResult[4];

  return {
    확진자: Number(확진자수),
    퇴원자: Number(격리해제),
    사망자: 0,
    입원환자: Number(확진자수) - (Number(격리해제) + Number(자가격리)),
    자가격리: Number(자가격리),
    updatedAt: DateTime.local().set({
      month: Number(month),
      day: Number(day),
      hour: Number(hour),
      minute: Number(minute),
      second: 0,
      millisecond: 0,
    }),
  } as ICoronaStats;
}

if (require.main === module) {
  module.exports.default().then(console.info);
}
