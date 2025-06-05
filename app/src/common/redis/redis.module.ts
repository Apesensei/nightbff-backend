import { Module, Global, Provider } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { REDIS_CLIENT } from "./redis.constants";
import { Logger } from "@nestjs/common";

const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: (configService: ConfigService, logger: Logger) => {
    const host = configService.get<string>("REDIS_HOST", "redis_perf");
    const port = configService.get<number>("REDIS_PORT", 6379);
    const password = configService.get<string>("REDIS_PASSWORD");
    logger.log(`Creating Redis client for ${host}:${port}`);

    const client = new Redis({
      host: host,
      port: port,
      password: password,
      lazyConnect: true, // Connect lazily
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        logger.warn(
          `Redis retrying connection (attempt ${times}), delay ${delay}ms`,
        );
        return delay;
      },
      reconnectOnError: (err) => {
        logger.error(`Redis reconnectOnError: ${err.message}`);
        // Only retry on certain errors if needed, default is to retry
        return true;
      },
    });

    client.on("connect", () => logger.log("Redis client connected"));
    client.on("ready", () => logger.log("Redis client ready"));
    client.on("error", (error: Error) =>
      logger.error(`Redis client error: ${error.message}`, error.stack),
    );
    client.on("close", () => logger.warn("Redis client connection closed"));
    client.on("reconnecting", () =>
      logger.warn("Redis client reconnecting..."),
    );
    client.on("end", () => logger.warn("Redis client connection ended"));

    return client;
  },
  inject: [ConfigService, Logger],
};

@Global() // Make providers available globally, simplifies imports in feature modules
@Module({
  imports: [ConfigModule], // Import ConfigModule to make ConfigService available
  providers: [redisProvider, Logger], // Provide the Redis client and Logger
  exports: [redisProvider], // Export the Redis client provider
})
export class RedisModule {}
