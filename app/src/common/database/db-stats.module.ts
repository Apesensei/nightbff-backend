import { Module } from "@nestjs/common";
import { DbStatsService } from "./db-stats.service";
import { DbStatsController } from "./db-stats.controller";

@Module({
  providers: [DbStatsService],
  controllers: [DbStatsController],
})
export class DbStatsModule {} 