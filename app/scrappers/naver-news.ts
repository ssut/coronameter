import './init';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { DateTime } from 'luxon';

export default async function () {
  await axios.get('https://m.search.naver.com');
  const $ = await axios.get('https://m.search.naver.com/search.naver?where=m_news&query=%EC%BD%94%EB%A1%9C%EB%82%98%20%EC%82%AC%EB%A7%9D%EC%9E%90&sm=mtb_tnw&sort=0&photo=0&field=0&pd=0&ds=&de=&docid=&related=0&mynews=0&office_type=0&office_section_code=0&news_office_checked=&nso=so%3Ar%2Cp%3Aall').then(resp => cheerio.load(resp.data));

  const titles = $('#news_result_list div.tit').map((_, title) => $(title).text().trim()).get();
  const items = titles
    .map((title) => {
      let score = -1;

      if (title.includes('사망')) {
        score++;
      }
      if (/총[\s]+?([0-9]+)명/.test(title) || /국내 ([0-9]+)번째/.test(title)) {
        score++;
      }

      return {
        title,
        score,
      };
    })
    .filter(({ score }) => score > 0)
    .map(({ title }) => {
      const { death } = /(총|국내)\s?(?<death>[0-9]+)(명|번째)/.exec(title)?.groups ?? {};
      const deathNum = Number(death);

      return {
        title,
        death: deathNum,
      };
    })
    .filter(({ death }) => !isNaN(death))
    .sort((a, b) => b.death - a.death);

  return items;
}

if (require.main === module) {
  module.exports.default().then(x => console.info(JSON.stringify(x, null, 2)));
}
