import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CacheModule } from "@nestjs/cache-manager";
import { ScheduleModule } from "@nestjs/schedule";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { EventController } from "./event.controller";
import { EventService } from "./event.service";
import { Event } from "./entities/event.entity";
import { EventAttendee } from "./entities/event-attendee.entity";
import { EventRepository } from "./repositories/event.repository";
import { EventImageService } from "./services/event-image.service";
import { EventImageController } from "./controllers/event-image.controller";
import { PlanAnalyticsService } from "./services/plan-analytics.service";
import { PlanTrendingService } from "./services/plan-trending.service";
import { MulterModule } from "@nestjs/platform-express";

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, EventAttendee]),
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
