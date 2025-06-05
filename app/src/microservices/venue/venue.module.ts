import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule } from "@nestjs/schedule";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { HttpModule } from "@nestjs/axios";
import { VenueController } from "./controllers/venue.controller";
import { VenueImageController } from "./controllers/venue-image.controller";
import { VenueAdminController } from "./controllers/venue-admin.controller";
import { VenueService } from "./services/venue.service";
import { VenueMapService } from "./services/venue-map.service";
import { GoogleMapsService } from "./services/google-maps.service";
import { VenueCacheService } from "./services/venue-cache.service";
import { RateLimiterService } from "./services/rate-limiter.service";
import { VenueImageService } from "./services/venue-image.service";
import { VenueAnalyticsService } from "./services/venue-analytics.service";
import { VenueTrendingService } from "./services/venue-trending.service";
import { VenueRepository } from "./repositories/venue.repository";
import { VenueTypeRepository } from "./repositories/venue-type.repository";
import { VenueEventRepository } from "./repositories/venue-event.repository";
import { VenueHourRepository } from "./repositories/venue-hour.repository";
import { VenueReviewRepository } from "./repositories/venue-review.repository";
import { VenuePhotoRepository } from "./repositories/venue-photo.repository";
import { Venue } from "./entities/venue.entity";
import { VenueType } from "./entities/venue-type.entity";
import { VenueEvent } from "./entities/venue-event.entity";
import { VenueHour } from "./entities/venue-hour.entity";
import { VenueReview } from "./entities/venue-review.entity";
import { VenuePhoto } from "./entities/venue-photo.entity";
import { MulterModule } from "@nestjs/platform-express";
import { UserModule } from "../user/user.module";
import { EventsModule } from "../event/events.module";
import { InterestModule } from "../interest/interest.module";
import { AuthModule } from "../auth/auth.module";
import { ScannedArea } from "./entities/scanned-area.entity";
import { ScannedAreaRepository } from "./repositories/scanned-area.repository";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bull";
import { VenueScanProducerService } from "./services/venue-scan-producer.service";
import { VenueScanConsumer } from "./jobs/venue-scan.consumer";
import { VenueMaintenanceService } from "./services/venue-maintenance.service";
import { ImageProcessingService } from "./services/image-processing.service";
import { ImageProcessingConsumer } from "./jobs/image-processing.consumer";
import KeyvRedis from "@keyv/redis";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { caching } from "cache-manager";
import Keyv from "keyv";

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      Venue,
      VenueType,
      VenueEvent,
      VenueHour,
      VenueReview,
      VenuePhoto,
      ScannedArea,
    ]),
    MulterModule.register({
      dest: "./uploads/venue",
    }),
    forwardRef(() => UserModule),
    EventsModule,
    InterestModule,
    AuthModule,
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>("REDIS_HOST", "localhost"),
          port: configService.get<number>("REDIS_PORT", 6379),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueueAsync({
      name: "venue-scan",
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        defaultJobOptions: {
          attempts: configService.get<number>("VENUE_SCAN_JOB_ATTEMPTS", 3),
          backoff: {
            type: "exponential",
            delay: configService.get<number>(
              "VENUE_SCAN_JOB_BACKOFF_DELAY",
              1000,
            ),
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueueAsync({
      name: "image-processing",
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
          removeOnComplete: 10,
          removeOnFail: 50,
        },
      }),
      inject: [ConfigService],
    }),
    ClientsModule.registerAsync([
      {
        name: "PLAN_SERVICE_RPC",
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.REDIS,
          options: {
            host: configService.get<string>("REDIS_HOST"),
            port: configService.get<number>("REDIS_PORT"),
            password: configService.get<string>("REDIS_PASSWORD"),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [VenueController, VenueImageController, VenueAdminController],
  providers: [
    VenueService,
    VenueRepository,
    VenueTypeRepository,
    VenueEventRepository,
    VenueHourRepository,
    VenueReviewRepository,
    VenuePhotoRepository,
    VenueMapService,
    GoogleMapsService,
    VenueCacheService,
    RateLimiterService,
    VenueImageService,
    VenueAnalyticsService,
    VenueTrendingService,
    ScannedAreaRepository,
    VenueScanProducerService,
    VenueScanConsumer,
    VenueMaintenanceService,
    ImageProcessingService,
    ImageProcessingConsumer,
    {
      provide: CACHE_MANAGER,
      useFactory: async (configService: ConfigService) => {
        const loggerPrefix = "[VenueModule Custom CacheFactory_v4]";
        console.log(
          `${loggerPrefix} Entering factory, Keyv will manage TTL...`,
        );

        const host = configService.get<string>("REDIS_HOST", "localhost");
        const port = configService.get<number>("REDIS_PORT", 6379);
        const password = configService.get<string>("REDIS_PASSWORD"); // No default, let KeyvRedis handle undefined
        const ttlSeconds = configService.get<number>(
          "CACHE_DEFAULT_TTL_VENUES",
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
          ttl: ttlSeconds * 1000, // Keyv expects TTL in milliseconds
        });
        console.log(
          `${loggerPrefix} KeyvRedis instance wrapped with Keyv, TTL set to ${ttlSeconds * 1000}ms.`,
        );

        // Type assertion needed as cache-manager's caching function expects a no-arg factory if no options are passed
        const keyvStoreFactory = () => keyvInstance;

        console.log(
          `${loggerPrefix} Attempting to call caching(keyvStoreFactory)`,
        );
        try {
          const cache = await caching(keyvStoreFactory as any);
          console.log(
            `${loggerPrefix} caching() call successful. Cache object created.`,
          );
          // Optional: Deep inspection for debugging, can be removed in production
          if (cache && (cache as any).store) {
            console.log(
              `${loggerPrefix}   Inspecting cache.store: constructor.name: ${(cache as any).store.constructor.name}`,
            );
            console.log(
              `${loggerPrefix}   Inspecting cache.store: typeof get: ${typeof (cache as any).store.get}`,
            );
            console.log(
              `${loggerPrefix}   Inspecting cache.store: typeof set: ${typeof (cache as any).store.set}`,
            );
          } else {
            console.log(
              `${loggerPrefix}   Cache or cache.store is undefined after caching() call.`,
            );
          }
          console.log(`${loggerPrefix} Returning cache INSTANCE from factory.`);
          return cache;
        } catch (error) {
          console.error(`${loggerPrefix} Error calling caching():`, error);
          throw error;
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [
    VenueService,
    VenueRepository,
    VenueTypeRepository,
    VenueEventRepository,
    VenueHourRepository,
    VenueReviewRepository,
    VenuePhotoRepository,
    VenueMapService,
    GoogleMapsService,
    VenueCacheService,
    RateLimiterService,
    VenueImageService,
    VenueAnalyticsService,
    VenueTrendingService,
    ScannedAreaRepository,
    VenueScanProducerService,
    GoogleMapsService,
  ],
})
export class VenueModule {}
