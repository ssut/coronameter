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

const getSummaries = async () => {
  const $ = await axios.get('http://ncov.mohw.go.kr/bdBoardList_Real.do?brdId=&brdGubun=&ncvContSeq=&contSeq=&board_id=&gubun=').then(resp => cheerio.load(resp.data));

  const koreaUpdatedAtText = $('.bv_content h4 + .s_descript').eq(0).text().split('현황', 2)[1].replace(/[^0-9.일시]/g, '');
  const koreaUpdatedAt = DateTime.fromFormat(koreaUpdatedAtText, 'M.d일H시').set({
    minute: 0,
    second: 0,
    millisecond: 0,
  });

  const koreaSummary = Object.fromEntries($('table.num').eq(0).find('tbody tr').get().map(tr => [$(tr).find('th').text().trim(), Number($(tr).find('td').text().replace(/[^0-9]/g, ''))])) as {
    확진환자: number;
    '확진환자 격리해제': number;
    사망자: number;
    검사진행: number;
  };

  const overseasSummary = Object.fromEntries($('table.num').eq(1).find('tbody tr').get().map((tr, index, arr) => {
    const $tr = $(tr);
    const country = $tr.find('.w_bold').text().trim();
    const text = $tr.find('td:last-child').text();
    const confirmed = Number(text.split('명', 1)[0].replace(/[^0-9]/g, ''));
    const deaths = !text.includes('사망') ? 0 : Number(text.split('사망')[1].replace(/[^0-9]/g, ''));

    if (index === arr.length - 1) { return null; }

    return [country, { confirmed, deaths }];
  }).filter(x => x)) as {
    [key: string]: {
      confirmed: number;
      deaths: number;
    },
  };

  const {
    confirmed,
    death,
    month,
    day,
    hour,
  } = /(?<confirmed>[0-9,]+)명\s?\(사망 (?<death>[0-9,]+)\) ?\((?<month>[0-9]{1,2})\.(?<day>[0-9]{1,2})일\s?(?<hour>[0-9]{1,2})/g.exec($('table.num').eq(1).parent().prev('.s_descript').text()).groups;
  const overseasUpdatedAt = DateTime.local().set({
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: 0,
    second: 0,
    millisecond: 0,
  });

  return {
    korea: {
      summary: koreaSummary,
      updatedAt: koreaUpdatedAt,
    },
    overseas: {
      total: {
        확진환자: Number(confirmed.replace(/[^0-9]/g, '')),
        사망자: Number(death.replace(/[^0-9]/g, '')),
      },
      summary: overseasSummary,
      updatedAt: overseasUpdatedAt,
    },
  };
};

const getKorea = async () => {
  const $ = await axios.get('http://ncov.mohw.go.kr/bdBoardList_Real.do?brdId=1&brdGubun=13&ncvContSeq=&contSeq=&board_id=&gubun=').then(resp => cheerio.load(resp.data));

  const tabularData = $('table.num tr').get().map(tr => $(tr).find('th, td').get().map(td => $(td).text().trim()));
  const header = [...tabularData[0].slice(0, tabularData[0].findIndex(x => x === '확진환자 (명)')), ...tabularData[1], ...tabularData[0].slice(tabularData[0].findIndex(x => x === '확진환자 (명)') + 1)].map(x => x.replace(/[^가-힣]/g, ''));;

  const withoutSum = tabularData.slice(tabularData.findIndex(row => row[0] === '합계') + 1);
  const data = Object.fromEntries(withoutSum.map((cols) => {
    return [cols[0], cols.reduce((obj, col, index) => {
      if (index === 0) {
        return obj;
      }

      obj[header[index]] = Number(col.replace(/[^0-9.]/g, ''));
      return obj;
    }, {})];
  })) as {
    [key in typeof mappings[keyof typeof mappings]]: {
      전일대비확진환자증감: number;
      확진환자수: number;
      사망자수: number;
      발생률: number;
      일일검사건수명: number;
    };
  };

  const updatedAtText = $('.info > span').text().replace(/[^0-9년월일시]/g, '');
  const updatedAt = DateTime.fromFormat(updatedAtText, 'yyyy년M월d일H시').set({
    minute: 0,
    second: 0,
    millisecond: 0,
  });

  return {
    data,
    updatedAt,
  };
};

export default async function () {
  const [summaries, { data: koreaData, updatedAt }] = await Promise.all([
    getSummaries(),
    getKorea(),
  ]);

  const korea = Object.fromEntries(Object.entries(koreaData).map(([province, data]) => {
    return [mappings[province], {
      확진자: data.확진환자수,
      사망자: data.사망자수,
      전일대비: data.전일대비확진환자증감,
      일일검사건수: data.일일검사건수명,
      updatedAt,
    } as ICoronaStats];
  })) as { [key: string]: ICoronaStats };

  return {
    summaries,
    korea,
  };
}

if (require.main === module) {
  // module.exports.default();
  module.exports.default().then(x => console.info(JSON.stringify(x.summaries, null, 2)));
}
