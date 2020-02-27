import axios from 'axios';
import axiosCookieJarSupport from 'axios-cookiejar-support';
import toughCookie from 'tough-cookie';

export const cookieJar = new toughCookie.CookieJar();

axiosCookieJarSupport(axios);
axios.defaults.jar = cookieJar;
axios.defaults.withCredentials = true;
axios.defaults.headers['common']['user-agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.116 Safari/537.36';
