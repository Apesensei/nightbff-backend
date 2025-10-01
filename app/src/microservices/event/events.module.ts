import { Module } from "@nestjs/common";
// Remove TypeOrmModule and specific entity imports if no longer needed here
// import { TypeOrmModule } from "@nestjs/typeorm";
// import { Event } from "./entities/event.entity";
// import { EventAttendee } from "./entities/event-attendee.entity";
// import { CacheModule } from "@nestjs/cache-manager"; // Will be removed
import { ScheduleModule } from "@nestjs/schedule";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { EventController } from "./event.controller";
import { EventService } from "./event.service";
import { EventRepository } from "./repositories/event.repository";
import { EventImageService } from "./services/event-image.service";
import { EventImageController } from "./controllers/event-image.controller";
import { PlanAnalyticsService } from "./services/plan-analytics.service";
import { PlanTrendingService } from "./services/plan-trending.service";
import { MulterModule } from "@nestjs/platform-express";
// Import modules needed for dependency resolution
import { DatabaseModule } from "../../common/database/database.module"; // Add this import
import { InterestModule } from "../interest/interest.module"; // Add this import
import { AuthModule } from "../auth/auth.module"; // Add this import
import { ConfigModule, ConfigService } from "@nestjs/config";
import KeyvRedis from "@keyv/redis";
import { CACHE_MANAGER } from "@nestjs/cache-manager"; // Added
import { createCache } from "cache-manager";
import Keyv from "keyv"; // Added

@Module({
  imports: [
    // Remove: TypeOrmModule.forFeature([Event, EventAttendee]),
    DatabaseModule, // Add this import
    InterestModule, // Add this import to resolve InterestService dependency
    AuthModule, // Add AuthModule to enable JWT validation
    MulterModule.register({
      dest: "./uploads/event",
    }),
    ConfigModule,
    // CacheModule.registerAsync removed
    ScheduleModule.forRoot(), // For cron jobs
    EventEmitterModule.forRoot(),
  ],
  controllers: [EventController, EventImageController],
  providers: [
    EventService,
    EventRepository,
    EventImageService,
    PlanAnalyticsService,
    PlanTrendingService,
    {
      provide: CACHE_MANAGER,
      useFactory: async (configService: ConfigService) => {
        const loggerPrefix = "[EventsModule Custom CacheFactory_v4]"; // Note: EventsModule
        console.log(
          `${loggerPrefix} Entering factory, Keyv will manage TTL...`,
        );

        const host = configService.get<string>("REDIS_HOST", "localhost");
        const port = configService.get<number>("REDIS_PORT", 6379);
        const password = configService.get<string>("REDIS_PASSWORD");
        // Use specific TTL for EventsModule, fallback to general default
        const ttlSeconds = configService.get<number>(
          "CACHE_DEFAULT_TTL_EVENTS",
          configService.get<number>("CACHE_DEFAULT_TTL", 300),
        );

        console.log(
          `${loggerPrefix} Configured Redis - Host: ${host}, Port: ${port}, Password Set: ${!!password}, TTL (s) for Keyv: ${ttlSeconds}`,
        );

        let keyvRedisInstance;
        try {
          console.log(`${loggerPrefix} Attempting to create KeyvRedis...`);
          const redisOptions: any = { host, port };
          if (password) {
            redisOptions.password = password;
          }
          keyvRedisInstance = new KeyvRedis(redisOptions);
          console.log(
            `${loggerPrefix} KeyvRedis instance created successfully.`,
          );
        } catch (error) {
          console.error(
            `${loggerPrefix} Error creating KeyvRedis instance:`,
            error,
          );
          throw error;
        }

        const keyvInstance = new Keyv({
          store: keyvRedisInstance,
          ttl: ttlSeconds * 1000,
        });
        console.log(
          `${loggerPrefix} KeyvRedis instance wrapped with Keyv, TTL set to ${ttlSeconds * 1000}ms.`,
        );

        console.log(`${loggerPrefix} Creating cache with createCache()`);
        try {
          const cache = createCache({ stores: [keyvInstance] });
          console.log(
            `${loggerPrefix} createCache() call successful. Cache object created.`,
          );
          console.log(`${loggerPrefix} Returning cache INSTANCE from factory.`);
          return cache;
        } catch (error) {
          console.error(`${loggerPrefix} Error calling createCache():`, error);
          throw error;
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [EventService, EventRepository],
})
export class EventsModule {}
