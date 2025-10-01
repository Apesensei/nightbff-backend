import {
  Controller,
  Get,
  Query,
  Param,
  NotFoundException,
  ParseUUIDPipe,
  UseInterceptors,
  DefaultValuePipe,
  ParseIntPipe,
  Inject,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from "@nestjs/swagger";
import { CityService } from "../services/city.service";
import { CityRepository } from "../repositories/city.repository"; // Inject Repo directly for now
// TODO: Lint: Investigate '@typescript-eslint/no-unused-vars' error for 'City'. It seems used in DTO constructors (lines 66, 98), but lint reports unused. Confirm necessity.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { City } from "../entities/city.entity"; // Import entity for type hints
import { TrendingCityDto, CityDetailsDto } from "../dto/city-response.dto"; // Import DTOs
import {
  CacheInterceptor,
  CacheKey,
  CacheTTL,
  CACHE_MANAGER,
} from "@nestjs/cache-manager"; // Import cache decorators and CACHE_MANAGER
import type { Cache } from "@nestjs/cache-manager";

// This controller might not have HTTP routes,
// but is needed for NestJS to register the @MessagePattern handlers in CityService.
@ApiTags("Cities") // Add specific tag for Swagger
@Controller("cities") // Base path /cities
export class CityController {
  constructor(
    // Keep CityService for potential future use / complex logic
    private readonly cityService: CityService,
    // Inject Repository directly for simple data fetching
    private readonly cityRepository: CityRepository,
    // Inject Cache Manager if needed for manual cache operations (e.g., invalidation)
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Get("trending")
  @UseInterceptors(CacheInterceptor) // Use standard interceptor
  @CacheKey("trending_cities") // Cache key for this endpoint
  @CacheTTL(3600) // Cache for 1 hour (3600 seconds)
  @ApiOperation({ summary: "Get trending cities" })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Number of cities to return (default 5)",
  })
  @ApiResponse({
    status: 200,
    description: "List of trending cities",
    type: [TrendingCityDto],
  })
  async getTrendingCities(
    @Query("limit", new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ): Promise<TrendingCityDto[]> {
    const cities = await this.cityRepository.findTrendingCities(limit);
    return cities.map((city) => new TrendingCityDto(city));
  }

  @Get(":cityId/details")
  @UseInterceptors(CacheInterceptor)
  @CacheKey("city_details_:cityId") // Dynamic cache key based on parameter
  @CacheTTL(86400) // Cache city details longer (e.g., 24 hours)
  @ApiOperation({ summary: "Get details for a specific city" })
  @ApiParam({ name: "cityId", description: "UUID of the city", type: String })
  @ApiResponse({
    status: 200,
    description: "Detailed city information",
    type: CityDetailsDto,
  })
  @ApiResponse({ status: 404, description: "City not found" })
  async getCityDetails(
    @Param("cityId", ParseUUIDPipe) cityId: string,
  ): Promise<CityDetailsDto> {
    // Fetch basic city info
    const city = await this.cityRepository.findOneById(cityId);
    if (!city) {
      throw new NotFoundException(`City with ID ${cityId} not found.`);
    }

    // TODO (Deferred): Add aggregation logic here
    // - Fetch related Plans (e.g., using PlanService)
    // - Fetch related Events (e.g., using EventService via RPC)
    // - Map aggregated data to CityDetailsDto

    // Return DTO (currently just maps the City entity)
    return new CityDetailsDto(city);
  }

  // Message handlers are defined in CityService using @MessagePattern
}
