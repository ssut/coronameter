import { DateTime } from 'luxon';
import { CDCInfo } from './../models/cdc-info';
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
    const due = DateTime.local().set({ hour: 0, minute: 0, second: 0, millisecond: 0 }).toJSDate();

    const [stats, yesterdayStats, overseasSummaries, yesterdayOverseasSummaries, overseasTotal, yesterdayOverseasTotal] = await Promise.all([
      Stat.getLatestStatsByProvincesWithCorrections(),
      Stat.getYesterdayStatsByProvincesWithCorrections(),
      CDCInfo.getOverseasSummaries(),
      CDCInfo.getOverseasSummaries(due),
      CDCInfo.getOverseasTotal(),
      CDCInfo.getOverseasTotal(due),
    ]);

    const getSum = (stats: any[], what: keyof Stat) => stats.reduce((accum, stat) => stat && typeof stat[what] === 'number' && stat[what] !== -1 ? accum + (stat as any)[what] : accum, 0);

    const summary = await CDCInfo.getSummary('대한민국');
    const yesterdaySummary = await CDCInfo.getSummary('대한민국', due);

    const totalStatConfirmed = getSum(stats, 'confirmed');
    const totalYesterdayStatConfirmed = getSum(yesterdayStats, 'confirmed');

    const totalStatFatality = getSum(stats, 'fatality');
    const totalYesterdayStatFatality = getSum(yesterdayStats, 'fatality');

    const aggregated = {
      korea: {
        confirmed: Math.max(summary?.confirmed, totalStatConfirmed),
        yesterdayConfirmed: Math.max(yesterdaySummary?.confirmed, totalYesterdayStatConfirmed),
        fatality: Math.max(summary?.fatality, totalStatFatality),
        yesterdayFatality: Math.max(yesterdaySummary?.fatality, totalYesterdayStatFatality),
      },
      overseas: {
        confirmed: overseasTotal?.confirmed ?? -1,
        yesterdayConfirmed: yesterdayOverseasTotal?.confirmed ?? -1,
        fatality: overseasTotal?.fatality ?? -1,
        yesterdayFatality: yesterdayOverseasTotal?.fatality ?? -1,
      },
    };

    const overseasStats = Object.fromEntries(
      overseasSummaries.sort((x, y) => y.confirmed - x.confirmed).map(info => {
        const yesterday = yesterdayOverseasSummaries.find(x => x.country === info.country);

        return [info.country, {
          confirmed: info.confirmed,
          yesterdayConfirmed: yesterday?.confirmed ?? -1,
          fatality: info.fatality,
          yesterdayFatality: yesterday?.fatality ?? -1,
        }];
      }),
    );

    return {
      aggregated,
      stats,
      overseasStats,
    };
  }

  @GET({
    url: '/provinces',
  })
  public async getProvinces() {
    return Stat.getDistinctProvinces();
  }
}
