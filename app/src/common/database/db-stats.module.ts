import { Module } from "@nestjs/common";
import { DbStatsService } from "./db-stats.service";
import { DbStatsController } from "./db-stats.controller";
import { DatabaseModule } from "./database.module";

@Module({
  imports: [DatabaseModule],
  providers: [DbStatsService],
  controllers: [DbStatsController],
  exports: [DbStatsService],
})
export class DbStatsModule {}
