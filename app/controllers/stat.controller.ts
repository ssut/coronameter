import { GET, RequestHandler, Controller } from 'fastify-decorators';

@Controller({
  route: '/stats',
})
export default class StatHandler {
  @GET({
    url: '/latest',
  })
  public async getLastestStats() {
    return 'Hi';
  }
}
