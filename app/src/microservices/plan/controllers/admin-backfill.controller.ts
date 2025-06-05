import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  ConflictException,
  InternalServerErrorException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { UserRole } from "../../auth/entities/user.entity";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { VenueCityBackfillJob } from "../jobs/venue-city-backfill.job";
import { EventCityBackfillJob } from "../jobs/event-city-backfill.job";

@ApiTags("Admin - Backfill")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN) // Restrict to Admins
@Controller("admin/backfill")
export class AdminBackfillController {
  private readonly logger = new Logger(AdminBackfillController.name);

  constructor(
    private readonly venueBackfillJob: VenueCityBackfillJob,
    private readonly eventBackfillJob: EventCityBackfillJob,
  ) {}

  @Post("venues")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Trigger the backfill job to add cityId to venues" })
  @ApiResponse({ status: 202, description: "Venue backfill job started." })
  @ApiResponse({ status: 409, description: "Job already running." })
  @ApiResponse({
    status: 500,
    description: "Internal server error during job execution.",
  })
  @ApiResponse({ status: 403, description: "Forbidden." })
  async triggerVenueBackfill() {
    this.logger.log("Received request to trigger venue city backfill.");
    try {
      await this.venueBackfillJob.runBackfill();
      return {
        message:
          "Venue city backfill job finished or already completed without errors reported synchronously.",
      };
    } catch (error) {
      this.logger.warn(`Venue backfill job failed: ${error.message}`);
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Venue backfill job failed: ${error.message}`,
      );
    }
  }

  @Post("events")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Trigger the backfill job to add cityId to events" })
  @ApiResponse({ status: 202, description: "Event backfill job started." })
  @ApiResponse({ status: 409, description: "Job already running." })
  @ApiResponse({
    status: 500,
    description: "Internal server error during job execution.",
  })
  @ApiResponse({ status: 403, description: "Forbidden." })
  async triggerEventBackfill() {
    this.logger.log("Received request to trigger event city backfill.");
    try {
      await this.eventBackfillJob.runBackfill();
      return {
        message:
          "Event city backfill job finished or already completed without errors reported synchronously.",
      };
    } catch (error) {
      this.logger.warn(`Event backfill job failed: ${error.message}`);
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Event backfill job failed: ${error.message}`,
      );
    }
  }
}
