import { Module, forwardRef } from "@nestjs/common";
import { PlanController } from "./plan.controller";
import { PlanService } from "./plan.service";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { CitySeederService } from "./seeders/city.seeder.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule } from "@nestjs/schedule";
import KeyvRedis from "@keyv/redis";
import { Logger } from "@nestjs/common";
import { RedisModule } from "../../common/redis/redis.module";
import Keyv from "keyv";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { createCache } from "cache-manager";

// Import Entities
import { City } from "./entities/city.entity";
import { Plan } from "./entities/plan.entity";
import { PlanUser } from "./entities/plan-user.entity";

// Import Repositories
import { CityRepository } from "./repositories/city.repository";
import { PlanRepository } from "./repositories/plan.repository";
import { PlanUserRepository } from "./repositories/plan-user.repository";

// Import Services
import { CityService } from "./services/city.service";
import { CityImageService } from "./services/city-image.service";
import { CityTrendingJob } from "./jobs/city-trending.job";
import { VenueCityBackfillJob } from "./jobs/venue-city-backfill.job";
import { EventCityBackfillJob } from "./jobs/event-city-backfill.job";
import { CacheWarmingService } from "./services/cache-warming.service";

// Import Controllers
import { CityController } from "./controllers/city.controller";
import { AdminBackfillController } from "./controllers/admin-backfill.controller";
import { PerformanceMonitoringController } from "./controllers/performance-monitoring.controller";

// Import Shared Modules & Modules providing dependencies
import { VenueModule } from "../venue/venue.module";
import { AuthModule } from "../auth/auth.module";
// import { SharedServicesModule } from '../../shared/shared-services.module';

@Module({
  imports: [
    ConfigModule, // Ensure ConfigModule is imported if ConfigService is used
    ScheduleModule.forRoot(),
    RedisModule,
    AuthModule, // Add AuthModule to enable JWT validation
    ClientsModule.registerAsync([
      {
        name: "PLAN_EVENTS_SERVICE", // Client for emitting events
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.REDIS,
          options: {
            host: configService.get<string>("REDIS_HOST"),
            port: configService.get<number>("REDIS_PORT"),
            password: configService.get<string>("REDIS_PASSWORD"), // Add password if configured
          },
        }),
        inject: [ConfigService],
      },
      {
        name: "PLAN_SERVICE_RPC", // RPC client *within* Plan service to call itself (e.g., for backfill)
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
      {
        name: "VENUE_SERVICE_RPC", // RPC client to call Venue service
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
      {
        name: "EVENT_SERVICE_RPC", // RPC client to call Event service
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
    TypeOrmModule.forFeature([City, Plan, PlanUser]), // Register entities
    forwardRef(() => VenueModule), // Import VenueModule (use forwardRef for safety)
    // SharedServicesModule, // Example: Import if GoogleMapsService is provided here
  ],
  controllers: [
    PlanController,
    CityController,
    AdminBackfillController,
    PerformanceMonitoringController,
  ],
  providers: [
    PlanService,
    CitySeederService,
    CityRepository,
    PlanRepository,
    PlanUserRepository,
    CityService,
    CityImageService,
    CityTrendingJob,
    VenueCityBackfillJob,
    EventCityBackfillJob,
    CacheWarmingService,
    Logger,
    {
      provide: CACHE_MANAGER,
      useFactory: async (configService: ConfigService) => {
        const loggerPrefix = "[PlanModule Custom CacheFactory_v4]";
        console.log(
          `${loggerPrefix} Entering factory, Keyv will manage TTL...`,
        );

        const host = configService.get<string>("REDIS_HOST", "localhost");
        const port = configService.get<number>("REDIS_PORT", 6379);
        const password = configService.get<string>("REDIS_PASSWORD");
        const ttlSeconds = configService.get<number>("CACHE_DEFAULT_TTL", 300);

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
  exports: [
    PlanService,
    CitySeederService,
    CityRepository,
    PlanRepository,
    PlanUserRepository,
    CityService,
  ],
})
export class PlanModule {}
