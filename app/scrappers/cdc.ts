import { ICoronaStats } from './interface';
import { DateTime } from 'luxon';
import './init';
import axios from 'axios';
import * as cheerio from 'cheerio';

const mappings = Object.freeze({
  서울: '서울특별시',
  부산: '부산광역시',
  대구: '대구광역시',
  인천: '인천광역시',
  광주: '광주광역시',
  대전: '대전광역시',
  울산: '울산광역시',
  세종: '세종특별자치시',
  경기: '경기도',
  강원: '강원도',
  충북: '충청북도',
  충남: '충청남도',
  전북: '전라북도',
  전남: '전라남도',
  경북: '경상북도',
  경남: '경상남도',
  제주: '제주특별자치도',
});

export default async function () {
  const $ = await axios.get('http://ncov.mohw.go.kr/bdBoardList_Real.do?brdId=1&brdGubun=13&ncvContSeq=&contSeq=&board_id=&gubun=').then(resp => cheerio.load(resp.data));

  const updatedAtText = $('.timetable p.info span').text().replace(/\([가-힣]\)/g, '');
  const updatedAt = DateTime.fromFormat(updatedAtText, 'yyyy년 M월 d일 H시');

  const tabularData = $('table.num tr').get().map(tr => $(tr).find('th, td').get().map(td => $(td).text().trim()));

  const header = tabularData[1];
  const select = (province: keyof typeof mappings) => {
    const row = tabularData.find(([head]) => head === province);
    if (!row) {
      return null;
    }

    const obj = Object.fromEntries(header.map((title, index, arr) => [
      title === '계' ? (arr.indexOf(title, index + 1) > -1 ? '확진환자' : '검사환자') : title,
      Number(row.slice(2)[index].replace(/[^0-9]/g, '')),
    ]));
    return obj;
  };

  const data = Object.keys(mappings).reduce((obj, province) => {
    obj[province] = select(province as any);

    return obj;
  }, {} as { [key in keyof typeof mappings]: any });

  return Object.entries(data).reduce((obj, [shortProvince, data]) => {
    obj[mappings[shortProvince]] = {
      확진자: data.확진환자,
      입원환자: data['격리 중'],
      퇴원자: data.격리해제,
      사망자: data.사망,
      자가격리: NaN,
      검사중: data['검사 중'],
      음성: data.결과음성,
      updatedAt,
    } as ICoronaStats;

    return obj;
  }, {} as { [key in typeof mappings[keyof typeof mappings]]: ICoronaStats });
}

if (require.main === module) {
  module.exports.default().then(console.info);
}
