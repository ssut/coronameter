import { GET, RequestHandler, Controller } from 'fastify-decorators';
import { Stat } from '../models';

@Controller({
  route: '/stats',
})
export default class StatHandler {
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
