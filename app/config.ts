import 'dotenv/config';

const env = process.env;

export default class Config {
  public static Host = env.HOST! || '0.0.0.0';
  public static Port = Number(env.PORT!) || 3300;

  public static Postgres = Object.freeze({
    URL: env.POSTGRES_URL!,
  });

  public static Google = Object.freeze({
    VisionAPI: Object.freeze({
      Credentials: Object.freeze({
        client_email: env.GOOGLE_VISION_API_CREDENTIALS_CLIENT_EMAIL!,
        private_key: env.GOOGLE_VISION_API_CREDENTIALS_PRIVATE_KEY?.replace(/\\n/g, '\n') ?? '',
      }),
    }),
  });

  public static Redis = Object.freeze({
    host: env.REDIS_HOST,
    port: Number(env.REDIS_PORT) || 6379,
    password: env.REDIS_PASSWORD,
    db: Number(env.REDIS_DB) || 2,
  });

  public static Chat = Object.freeze({
    maxUsersPerChat: Number(env.CHAT_MAX_USERS_PER_CHAT),
    rateLimitPerMinute: Number(env.CHAT_RATE_LIMIT_PER_MINUTE),
  });

  public static Sentry = Object.freeze({
    DSN: env.SENTRY_DSN!,
  });
}
