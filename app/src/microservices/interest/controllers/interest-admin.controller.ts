import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  ParseUUIDPipe,
  BadRequestException,
} from "@nestjs/common";
import { InterestService } from "../services/interest.service";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { UserRole } from "../../auth/entities/user.entity";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { PaginatedInterestResponseDto } from "../dto/paginated-interest-response.dto";
import { InterestResponseDto } from "../dto/interest-response.dto";
import { CreateInterestDto } from "../dto/create-interest.dto";
import { UpdateInterestDto } from "../dto/update-interest.dto";
import { InterestMigrationService } from "../services/migration.service";

@ApiTags("Interest Admin")
@Controller("admin/interests")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class InterestAdminController {
  constructor(
    private readonly interestService: InterestService,
    private readonly migrationService: InterestMigrationService,
  ) {}

  @ApiOperation({ summary: "Get all interests with full details" })
  @ApiResponse({
    status: 200,
    description: "Returns paginated interests with full details",
    type: PaginatedInterestResponseDto,
  })
  @Get()
  async getAllInterests(
    @Query("page") page = 1,
    @Query("limit") limit = 20,
    @Query("search") search?: string,
    @Query("includeInactive") includeInactive = false,
  ): Promise<PaginatedInterestResponseDto> {
    const onlyActive = !includeInactive;
    return this.interestService.getAllInterests(
      { page, limit },
      { search, onlyActive },
    );
  }

  @ApiOperation({ summary: "Create a new interest" })
  @ApiResponse({
    status: 201,
    description: "Interest created successfully",
    type: InterestResponseDto,
  })
  @Post()
  async createInterest(
    @Body() createInterestDto: CreateInterestDto,
  ): Promise<InterestResponseDto> {
    return this.interestService.createInterest(createInterestDto);
  }

  @ApiOperation({ summary: "Update an existing interest" })
  @ApiResponse({
    status: 200,
    description: "Interest updated successfully",
    type: InterestResponseDto,
  })
  @ApiResponse({ status: 404, description: "Interest not found" })
  @Put(":id")
  async updateInterest(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateInterestDto: UpdateInterestDto,
  ): Promise<InterestResponseDto> {
    const interest = await this.interestService.updateInterest(
      id,
      updateInterestDto,
    );
    if (!interest) {
      throw new NotFoundException(`Interest with ID ${id} not found`);
    }
    return interest;
  }

  @ApiOperation({ summary: "Delete an interest" })
  @ApiResponse({ status: 200, description: "Interest deleted successfully" })
  @ApiResponse({ status: 404, description: "Interest not found" })
  @Delete(":id")
  async deleteInterest(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; message: string }> {
    const deleted = await this.interestService.deleteInterest(id);
    if (!deleted) {
      throw new NotFoundException(`Interest with ID ${id} not found`);
    }
    return { success: true, message: "Interest deleted successfully" };
  }

  @ApiOperation({
    summary: "Run interest migration from string-based to entity-based",
  })
  @ApiResponse({ status: 200, description: "Migration completed successfully" })
  @Post("migrate")
  async runMigration(
    @Body()
    migrationData: {
      predefinedInterests: Array<{
        name: string;
        icon: string;
        description?: string;
        isIconEmoji?: boolean;
      }>;
      dryRun?: boolean;
    },
  ): Promise<{ success: boolean; message: string }> {
    if (
      !migrationData.predefinedInterests ||
      !Array.isArray(migrationData.predefinedInterests)
    ) {
      throw new BadRequestException("predefinedInterests must be an array");
    }

    try {
      await this.migrationService.runMigration(
        migrationData.predefinedInterests,
        migrationData.dryRun || false,
      );

      return {
        success: true,
        message: `Migration ${migrationData.dryRun ? "(dry run) " : ""}completed successfully`,
      };
    } catch (error) {
      throw new BadRequestException(`Migration failed: ${error.message}`);
    }
  }

  @ApiOperation({ summary: "Update interest sort order" })
  @ApiResponse({ status: 200, description: "Sort order updated successfully" })
  @Put("sort-order")
  async updateSortOrder(
    @Body() sortOrderData: { interestIds: string[] },
  ): Promise<{ success: boolean; message: string }> {
    if (
      !sortOrderData.interestIds ||
      !Array.isArray(sortOrderData.interestIds)
    ) {
      throw new BadRequestException("interestIds must be an array");
    }

    try {
      await this.interestService.updateInterestsSortOrder(
        sortOrderData.interestIds,
      );
      return { success: true, message: "Sort order updated successfully" };
    } catch (error) {
      throw new BadRequestException(
        `Failed to update sort order: ${error.message}`,
      );
    }
  }

  @ApiOperation({ summary: "Get interest usage analytics" })
  @ApiResponse({ status: 200, description: "Returns interest usage analytics" })
  @Get("analytics")
  async getInterestAnalytics(): Promise<{
    topInterests: Array<{ id: string; name: string; count: number }>;
    totalUsageCount: number;
    lastUpdated: Date;
  }> {
    return this.interestService.getInterestAnalytics();
  }
}
