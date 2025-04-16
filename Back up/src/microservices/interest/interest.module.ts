import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { InterestService } from "./services/interest.service";
import { InterestDisplayService } from "./services/interest-display.service";
import { InterestAnalyticsService } from "./services/interest-analytics.service";
import { InterestMigrationService } from "./services/migration.service";
import { InterestController } from "./controllers/interest.controller";
import { InterestAdminController } from "./controllers/interest-admin.controller";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../../common/database/database.module";
import { InterestRepository } from "./repositories/interest.repository";

@Module({
  imports: [
    DatabaseModule,
    CacheModule.register({
      ttl: 300, // 5 minutes default TTL
      max: 100, // maximum number of items in cache
    }),
    AuthModule,
  ],
  controllers: [InterestController, InterestAdminController],
  providers: [
    InterestService,
    InterestDisplayService,
    InterestAnalyticsService,
    InterestMigrationService,
    InterestRepository,
  ],
  exports: [
    InterestService,
    InterestDisplayService,
    InterestAnalyticsService,
    InterestMigrationService,
  ],
})
export class InterestModule {}
