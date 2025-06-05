import {
  Controller,
  Get,
  Body,
  Put,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
  ParseBoolPipe,
  Req,
  UseInterceptors,
} from "@nestjs/common";
import { InterestService } from "../services/interest.service";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { User } from "../../auth/entities/user.entity";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { PaginatedInterestResponseDto } from "../dto/paginated-interest-response.dto";
import { InterestResponseDto } from "../dto/interest-response.dto";
import { UserInterestsDto } from "../dto/user-interests.dto";
import { Request } from "express";
import { CacheInterceptor, CacheKey, CacheTTL } from "@nestjs/cache-manager";

@ApiTags("interests")
@Controller("interests")
export class InterestController {
  constructor(private readonly interestService: InterestService) {}

  @ApiOperation({ summary: "Get all interests with optional filtering" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "onlyActive", required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: "Returns paginated interests",
    type: PaginatedInterestResponseDto,
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(CacheInterceptor)
  @CacheKey("interests:all")
  @CacheTTL(3600)
  @Get()
  async getAllInterests(
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("search") search?: string,
    @Query("onlyActive", new DefaultValuePipe(true), ParseBoolPipe)
    onlyActive?: boolean,
  ): Promise<PaginatedInterestResponseDto> {
    return this.interestService.getAllInterests(
      { page, limit },
      { search, onlyActive },
    );
  }

  @ApiOperation({ summary: "Get popular interests" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: "Returns popular interests",
    type: [InterestResponseDto],
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(CacheInterceptor)
  @CacheKey("interests:popular")
  @CacheTTL(3600)
  @Get("popular")
  async getPopularInterests(
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<InterestResponseDto[]> {
    return this.interestService.getPopularInterests(limit);
  }

  @ApiOperation({ summary: "Get trending interests" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: "Returns trending interests",
    type: [InterestResponseDto],
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(CacheInterceptor)
  @CacheKey("interests:trending")
  @CacheTTL(3600)
  @Get("trending")
  async getTrendingInterests(
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<InterestResponseDto[]> {
    return this.interestService.getTrendingInterests(limit);
  }

  @ApiOperation({ summary: "Get interests for the current user" })
  @ApiResponse({
    status: 200,
    description: "Returns user interests",
    type: [InterestResponseDto],
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(CacheInterceptor)
  @CacheKey("interests:user:me")
  @CacheTTL(1800)
  @Get("user/me")
  async getUserInterests(
    @Req() req: Request & { user: User },
  ): Promise<InterestResponseDto[]> {
    return this.interestService.getUserInterests(req.user.id);
  }

  @ApiOperation({ summary: "Update interests for the current user" })
  @ApiResponse({
    status: 200,
    description: "Interests updated successfully",
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put("user/me")
  async updateUserInterests(
    @CurrentUser() user: User,
    @Body() userInterestsDto: UserInterestsDto,
  ): Promise<{ success: boolean; message: string }> {
    await this.interestService.updateUserInterests(
      user.id,
      userInterestsDto.interestIds,
    );
    return {
      success: true,
      message: `Updated interests for user ${user.id}`,
    };
  }

  @ApiOperation({ summary: "Get recommended interests based on user profile" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: "Returns recommended interests",
    type: [InterestResponseDto],
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(CacheInterceptor)
  @CacheKey("interests:recommendations")
  @CacheTTL(1800)
  @Get("recommendations")
  async getRecommendedInterests(
    @CurrentUser() user: User,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<InterestResponseDto[]> {
    return this.interestService.getRecommendedInterests(user.id, limit);
  }

  // IMPORTANT: Keep /:id endpoint last to avoid capturing other routes
  @ApiOperation({ summary: "Get an interest by ID" })
  @ApiResponse({
    status: 200,
    description: "Returns the interest",
    type: InterestResponseDto,
  })
  @ApiResponse({ status: 404, description: "Interest not found" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(CacheInterceptor)
  @CacheKey("interests:by-id")
  @CacheTTL(3600)
  @Get(":id")
  async getInterestById(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<InterestResponseDto> {
    const interest = await this.interestService.getInterestById(id);
    if (!interest) {
      throw new NotFoundException(`Interest with ID ${id} not found`);
    }
    return interest;
  }
}
