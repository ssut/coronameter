import { GET, RequestHandler, Controller } from 'fastify-decorators';
import { Stat } from '../models';
import bluebird from 'bluebird';

@Controller({
  route: '/stats',
})
export default class StatHandler {
  @GET({
    url: '/aggregated',
  })
  public async getAggregatedStats() {
    const [stats, yesterdayStats] = await Promise.all([
      Stat.getLatestStatsByProvinces(),
      Stat.getYesterdayStatsByProvinces(),
    ]);

    const getSum = (stats: Stat[], what: keyof Stat) => stats.reduce((accum, stat) => stat[what] !== -1 ? accum + (stat as any)[what] : accum, 0);

    const totalConfirmed = getSum(stats, 'confirmed');
    const totalConfirmedYesterday = getSum(yesterdayStats, 'confirmed');

    const totalFatality = getSum(stats, 'fatality');
    const totalFatalityYesterday = getSum(yesterdayStats, 'fatality');

    const aggregated = {
      confirmed: totalConfirmed,
      confirmedDiff: totalConfirmed - totalConfirmedYesterday,

      fatality: totalFatality,
      fatalityDiff: totalFatality - totalFatalityYesterday,
    };

    return {
      aggregated,
      stats,
    };
  }

  @GET({
    url: '/latest',
  })
  public async getLastestStats() {
    return Stat.getLatestStatsByProvinces();
  }

  @GET({
    url: '/provinces',
  })
  public async getProvinces() {
    return Stat.getDistinctProvinces();
  }
}
