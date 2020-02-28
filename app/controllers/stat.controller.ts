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
    const stats = await Stat.getLatestStatsByProvinces();

    return {
      aggregated: {
        confirmed: stats.reduce((accum, stat) => stat.confirmed !== -1 ? accum + stat.confirmed : accum, 0),
      },
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
