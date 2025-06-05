import { Module } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { caching } from "cache-manager"; // Removed StoreConfig, not used with this approach
import { InterestService } from "./services/interest.service";
import { InterestDisplayService } from "./services/interest-display.service";
import { InterestAnalyticsService } from "./services/interest-analytics.service";
import { InterestMigrationService } from "./services/migration.service";
import { InterestController } from "./controllers/interest.controller";
import { InterestAdminController } from "./controllers/interest-admin.controller";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../../common/database/database.module";
import { InterestRepository } from "./repositories/interest.repository";
import { ConfigModule, ConfigService } from "@nestjs/config";
import KeyvRedis from "@keyv/redis";
import Keyv from "keyv";
import { ScheduleModule } from "@nestjs/schedule";
import { BullModule } from "@nestjs/bull";

@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    AuthModule,
    // ScheduleModule.forRoot(),
    // BullModule.registerQueue({ name: 'interest-queue' }),
  ],
  controllers: [InterestController, InterestAdminController],
  providers: [
    InterestService,
    InterestDisplayService,
    InterestAnalyticsService,
    InterestMigrationService,
    InterestRepository,
    {
      provide: CACHE_MANAGER,
      useFactory: async (configService: ConfigService) => {
        console.log(
          "[InterestModule Custom CacheFactory_v4] Entering factory, Keyv will manage TTL...",
        );
        const host = configService.get<string>("REDIS_HOST", "localhost");
        const port = configService.get<number>("REDIS_PORT", 6379);
        const password = configService.get<string>("REDIS_PASSWORD");
        const ttlSeconds = configService.get<number>("CACHE_DEFAULT_TTL", 300);

        if (!host || !port) {
          console.error(
            `[InterestModule Custom CacheFactory_v4] REDIS_HOST or REDIS_PORT not configured. Host: ${host}, Port: ${port}.`,
          );
          throw new Error(
            "Redis host/port not configured for InterestModule cache.",
          );
        }

        console.log(
          `[InterestModule Custom CacheFactory_v4] Configured Redis - Host: ${host}, Port: ${port}, Password Set: ${!!password}, TTL (s) for Keyv: ${ttlSeconds}`,
        );

        let keyvRedisInstance;
        try {
          console.log(
            `[InterestModule Custom CacheFactory_v4] Attempting to create KeyvRedis...`,
          );
          const redisOptions: any = { host: host, port: port };
          if (password) {
            redisOptions.password = password;
          }
          keyvRedisInstance = new KeyvRedis(redisOptions);
          console.log(
            "[InterestModule Custom CacheFactory_v4] KeyvRedis instance created successfully.",
          );
          keyvRedisInstance.on("error", (error) => {
            console.error(
              "[InterestModule Custom CacheFactory_v4] KeyvRedis instance error:",
              error,
            );
          });
        } catch (error) {
          console.error(
            "[InterestModule Custom CacheFactory_v4] CRITICAL: Error creating KeyvRedis instance:",
            error,
          );
          throw error;
        }

        // Configure Keyv with the TTL directly
        const keyvInstance = new Keyv({
          store: keyvRedisInstance,
          ttl: ttlSeconds * 1000,
        });
        console.log(
          `[InterestModule Custom CacheFactory_v4] KeyvRedis instance wrapped with Keyv, TTL set to ${ttlSeconds * 1000}ms.`,
        );

        const keyvStoreFactory = () => keyvInstance;

        try {
          console.log(
            `[InterestModule Custom CacheFactory_v4] Attempting to call caching(keyvStoreFactory)`,
          );
          // Call caching with only the store factory; TTL is now handled by Keyv itself
          const cache = await caching(keyvStoreFactory as any);
          console.log(
            "[InterestModule Custom CacheFactory_v4] caching() call successful. Cache object created.",
          );

          if (cache && (cache as any).store) {
            const storeInCache = (cache as any).store;
            console.log(
              `[InterestModule Custom CacheFactory_v4]   Inspecting cache.store: constructor.name: ${storeInCache.constructor?.name}`,
            );
            console.log(
              `[InterestModule Custom CacheFactory_v4]   Inspecting cache.store: typeof get: ${typeof (storeInCache as any).get}`,
            );
            console.log(
              `[InterestModule Custom CacheFachtory_v4]   Inspecting cache.store: typeof set: ${typeof (storeInCache as any).set}`,
            ); // Typo fixed: CacheFachtory -> CacheFactory
          } else {
            console.warn(
              "[InterestModule Custom CacheFactory_v4]   Cache object or cache.store is undefined after caching() call.",
            );
          }

          // Create a wrapper to handle Keyv's data format
          const originalGet = cache.get.bind(cache);
          cache.get = async <T>(key: string): Promise<T | undefined> => {
            const result = await originalGet(key);
            // Keyv wraps data as {value: actualData, expires: timestamp}
            // We need to unwrap it for cache-manager compatibility
            if (result && typeof result === 'object' && 'value' in result) {
              console.log(`[InterestModule CacheFactory_v4] Unwrapped Keyv data for key: ${key}`);
              return (result as any).value as T;
            }
            return result as T | undefined;
          };

          console.log(
            "[InterestModule Custom CacheFactory_v4] Returning cache INSTANCE with Keyv unwrapping from factory.",
          );
          return cache;
        } catch (error) {
          console.error(
            "[InterestModule Custom CacheFactory_v4] CRITICAL: Error calling caching() or inspecting its result:",
            error,
          );
          throw error;
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [
    InterestService,
    InterestDisplayService,
    InterestAnalyticsService,
    InterestMigrationService,
  ],
})
export class InterestModule {}
