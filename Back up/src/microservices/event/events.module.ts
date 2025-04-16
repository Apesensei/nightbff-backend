import { Module } from "@nestjs/common";
// Remove TypeOrmModule and specific entity imports if no longer needed here
// import { TypeOrmModule } from "@nestjs/typeorm";
// import { Event } from "./entities/event.entity";
// import { EventAttendee } from "./entities/event-attendee.entity";
import { CacheModule } from "@nestjs/cache-manager";
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

@Module({
  imports: [
    // Remove: TypeOrmModule.forFeature([Event, EventAttendee]),
    DatabaseModule, // Add this import
    InterestModule, // Add this import to resolve InterestService dependency
    MulterModule.register({
      dest: "./uploads/event",
    }),
    CacheModule.register({
      ttl: 60 * 15, // 15 minutes default TTL
      max: 100, // maximum number of items in cache
    }),
    ScheduleModule.forRoot(), // For cron jobs
    EventEmitterModule,
  ],
  controllers: [EventController, EventImageController],
  providers: [
    EventService,
    EventRepository,
    EventImageService,
    PlanAnalyticsService,
    PlanTrendingService,
  ],
  exports: [EventService, EventRepository],
})
export class EventsModule {}
