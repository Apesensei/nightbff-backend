import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CacheModule } from "@nestjs/cache-manager";
import { Interest } from "./entities/interest.entity";
import { UserInterest } from "./entities/user-interest.entity";
import { EventInterest } from "./entities/event-interest.entity";
import { InterestService } from "./services/interest.service";
import { InterestDisplayService } from "./services/interest-display.service";
import { InterestAnalyticsService } from "./services/interest-analytics.service";
import { InterestMigrationService } from "./services/migration.service";
import { InterestController } from "./controllers/interest.controller";
import { InterestAdminController } from "./controllers/interest-admin.controller";
import { User } from "../user/entities/user.entity";
import { Event } from "../event/entities/event.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Interest,
      UserInterest,
      EventInterest,
      User,
      Event,
    ]),
    CacheModule.register({
      ttl: 300, // 5 minutes default TTL
      max: 100, // maximum number of items in cache
    }),
  ],
  controllers: [InterestController, InterestAdminController],
  providers: [
    InterestService,
    InterestDisplayService,
    InterestAnalyticsService,
    InterestMigrationService,
  ],
  exports: [
    InterestService,
    InterestDisplayService,
    InterestAnalyticsService,
    InterestMigrationService,
  ],
})
export class InterestModule {}
