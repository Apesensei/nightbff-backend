import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule } from "@nestjs/schedule";
import { CacheModule } from "@nestjs/cache-manager";
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

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CacheModule.register(),
    TypeOrmModule.forFeature([
      Venue,
      VenueType,
      VenueEvent,
      VenueHour,
      VenueReview,
      VenuePhoto,
    ]),
    MulterModule.register({
      dest: "./uploads/venue",
    }),
    UserModule,
    EventsModule,
    InterestModule,
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
  ],
  exports: [VenueService],
})
export class VenueModule {}
