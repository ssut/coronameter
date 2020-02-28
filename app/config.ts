const env = process.env;

export default class Config {
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
}
