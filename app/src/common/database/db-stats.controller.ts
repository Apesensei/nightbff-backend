import { Controller, Get } from "@nestjs/common";
import { DbStatsService } from "./db-stats.service";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { RolesGuard } from "../../microservices/auth/guards/roles.guard";
import { Roles } from "../../microservices/auth/decorators/roles.decorator";
import { UseGuards } from "@nestjs/common";
import { UserRole } from "../../microservices/auth/entities/user.entity";

@Controller("admin/db-stats")
@UseGuards(JwtAuthGuard, RolesGuard)
export class DbStatsController {
  constructor(private readonly statsService: DbStatsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  async getStats(): Promise<{ total: number; active: number; idle: number }> {
    return this.statsService.getStats();
  }
}
