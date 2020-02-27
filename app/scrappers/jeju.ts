import './init';
import { ICoronaStats } from './interface';
import axios from 'axios';
import { DateTime } from 'luxon';

export default async function () {
  const data = await axios.get('https://www.jeju.go.kr/api/corona.jsp', {
    headers: {
      accept: 'application/json',
      referer: 'https://www.jeju.go.kr/wel/healthCare/corona/coronaNotice.htm',
      'x-requested-with': 'XMLHttpRequest'
    },
  }).then(resp => resp.data);

  return {
    확진자: Number(data.field2),
    사망자: Number(data.field3),
    입원환자: NaN,
    퇴원자: NaN,
    자가격리: Number(data.field11),

    updatedAt: DateTime.fromFormat(data.field9, 'yyyy. M. d. H시'),
  } as ICoronaStats;
}

if (require.main === module) {
  module.exports.default().then(console.info);
}
