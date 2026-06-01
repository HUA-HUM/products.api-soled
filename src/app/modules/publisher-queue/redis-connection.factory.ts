import type { RedisOptions } from 'ioredis';

export function buildRedisConnection(): RedisOptions {
  const url = process.env.REDIS_URL;

  if (url) {
    const parsedUrl = new URL(url);

    return {
      host: parsedUrl.hostname,
      port: Number(parsedUrl.port || 6379),
      username: decodeURIComponent(parsedUrl.username || 'default'),
      password: parsedUrl.password
        ? decodeURIComponent(parsedUrl.password)
        : undefined,
      tls: parsedUrl.protocol === 'rediss:' ? {} : undefined,
      maxRetriesPerRequest: null,
    };
  }

  const host = process.env.REDIS_HOST;

  if (!host) {
    throw new Error('REDIS_HOST or REDIS_URL is not defined');
  }

  return {
    host,
    port: Number(process.env.REDIS_PORT ?? 6379),
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}
