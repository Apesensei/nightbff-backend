import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Req,
  HttpStatus,
  HttpCode,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { VenueService } from "../services/venue.service";
import { VenueResponseDto } from "../dto/venue-response.dto";
import { PaginatedVenueResponseDto } from "../dto/paginated-venue-response.dto";
import { TrendingVenuesRequestDto } from "../dto/trending-venues-request.dto";
import { DiscoverVenuesResponseDto } from "../dto/discover-venues-response.dto";
import { OptionalJwtAuthGuard } from "@/common/guards/optional-jwt-auth.guard";
import { User } from "@/microservices/auth/entities/user.entity";
import { Request } from "express";
import { VenueSearchDto } from "../dto/venue-search.dto";
import { CurrentUser } from "@/microservices/auth/decorators/current-user.decorator";

// Define interface for request with user
interface RequestWithUser extends Request {
  user?: User; // User is optional due to OptionalJwtAuthGuard
}

@ApiTags("venues")
@Controller("venues")
export class VenueController {
  constructor(private readonly venueService: VenueService) {}

  @Get("trending")
  @ApiOperation({ summary: "Get trending venues" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns trending venues",
    type: PaginatedVenueResponseDto,
  })
  @UseGuards(OptionalJwtAuthGuard)
  async getTrendingVenues(
    @Query() queryParams: TrendingVenuesRequestDto,
    @Req() req: RequestWithUser,
  ): Promise<PaginatedVenueResponseDto> {
    const userId = req.user?.id;
    return this.venueService.getTrendingVenues(queryParams, userId);
  }

  @Post(":id/follow")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Follow a venue" })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "Successfully followed venue",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Venue not found" })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "User already following venue",
  })
  async followVenue(
    @Param("id") venueId: string,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    if (!req.user) {
      // Guard ensures user exists, but belt-and-suspenders
      throw new UnauthorizedException();
    }
    await this.venueService.followVenue(req.user.id, venueId); // Call service method
  }

  @Delete(":id/follow")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Unfollow a venue" })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "Successfully unfollowed venue",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Venue not found" })
  async unfollowVenue(
    @Param("id") venueId: string,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    if (!req.user) {
      // Guard ensures user exists
      throw new UnauthorizedException();
    }
    await this.venueService.unfollowVenue(req.user.id, venueId); // Call service method
  }

  @Get("recently-viewed")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get recently viewed venues for the current user" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of recently viewed venues",
    type: [VenueResponseDto],
  })
  async getRecentlyViewed(
    @Req() req: RequestWithUser,
  ): Promise<VenueResponseDto[]> {
    if (!req.user) {
      // This check is technically redundant due to JwtAuthGuard, but good practice
      throw new UnauthorizedException();
    }
    const userId = req.user.id;
    return this.venueService.getRecentlyViewedVenues(userId);
  }

  @Get("discover")
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: "Get data for the main venue discovery page" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Data for discovery page",
    type: DiscoverVenuesResponseDto,
  })
  async getDiscoverPageData(
    @Req() req: RequestWithUser,
  ): Promise<DiscoverVenuesResponseDto> {
    const userId = req.user?.id;
    return this.venueService.getDiscoverVenuesData(userId);
  }

  @Get("search")
  @ApiOperation({
    summary:
      "Search for venues by various criteria, including 'forYou' interest ID",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns venues matching search criteria",
    type: PaginatedVenueResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Authentication required",
  })
  @ApiBearerAuth()
  @ApiQuery({
    name: "interestId",
    required: false,
    type: String,
    description:
      "Optional. Filter by interest ID, or use special value 'forYou' to filter by the authenticated user\'s first saved interest (V1). Requires authentication.",
  })
  @UseGuards(JwtAuthGuard)
  async searchVenues(
    @Query() searchDto: VenueSearchDto,
    @CurrentUser("id") userId: string,
  ): Promise<PaginatedVenueResponseDto> {
    return this.venueService.searchVenues(searchDto, userId);
  }

  @Get("recent-searches")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get recently viewed venues" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of recently viewed venues",
    type: [VenueResponseDto],
  })
  async getRecentSearches(
    @Req() req: RequestWithUser,
    @Query("limit") limit: number = 5,
  ): Promise<VenueResponseDto[]> {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return this.venueService.getRecentlyViewedVenues(req.user.id, limit);
  }

  // IMPORTANT: Keep /:id endpoint last to avoid capturing other routes
  @Get(":id")
  @ApiOperation({ summary: "Get venue details by ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Venue details",
    type: VenueResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Venue not found" })
  @UseGuards(OptionalJwtAuthGuard)
  async getVenueById(
    @Param("id") id: string,
    @Req() req: RequestWithUser,
  ): Promise<VenueResponseDto> {
    const userId = req.user?.id;
    // Ensure findById triggers view tracking and score update
    const venue = await this.venueService.findById(id, userId);
    // Use the public transformation method from VenueService
    return this.venueService.transformToVenueResponseDto(venue, userId);
  }
}
