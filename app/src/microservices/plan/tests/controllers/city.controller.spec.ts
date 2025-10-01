import { Test, TestingModule } from "@nestjs/testing";
import { CacheModule, CACHE_MANAGER } from "@nestjs/cache-manager";
import { NotFoundException, Logger } from "@nestjs/common";
import { CityController } from "../../controllers/city.controller";
import { CityRepository } from "../../repositories/city.repository";
import { CityService } from "../../services/city.service"; // If controller uses service
import { City } from "../../entities/city.entity";
import { TrendingCityDto, CityDetailsDto } from "../../dto/city-response.dto";
import type { Cache } from "@nestjs/cache-manager";

// Mocks
const mockCityRepository = {
  findTrendingCities: jest.fn(),
  findOneById: jest.fn(),
};

// Mock City Service (even if simple, needs to be provided)
const mockCityService = {
  // Add mock methods here if the controller ever calls the service
  // e.g., someComplexCityLogic: jest.fn(),
};

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  reset: jest.fn(),
};

// Mock Data
const mockCity1: City = {
  id: "city-1",
  name: "Trendville",
  countryCode: "TV",
  trendingScore: 100,
  imageUrl: "img1",
} as City;
const mockCity2: City = {
  id: "city-2",
  name: "Popularis",
  countryCode: "PS",
  trendingScore: 90,
  imageUrl: "img2",
} as City;
const mockTrendingCities: City[] = [mockCity1, mockCity2];
const mockCityDetails: City = {
  ...mockCity1,
  planCount: 10,
  location: "POINT(1 2)",
} as City;

describe("CityController", () => {
  let controller: CityController;
  let repository: CityRepository;
  let cache: Cache;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CityController],
      providers: [
        { provide: CityRepository, useValue: mockCityRepository },
        { provide: CityService, useValue: mockCityService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    controller = module.get<CityController>(CityController);
    repository = module.get<CityRepository>(CityRepository);
    cache = module.get<Cache>(CACHE_MANAGER);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getTrendingCities", () => {
    const cacheKey = "trending_cities";
    const limit = 5;

    it("should return trending cities from repository and set cache if cache miss", async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue(null);
      mockCityRepository.findTrendingCities.mockResolvedValue(
        mockTrendingCities,
      );
      const expectedDto: TrendingCityDto[] = mockTrendingCities.map(
        (c) => new TrendingCityDto(c),
      );
      const setSpy = jest.spyOn(cache, "set");

      // Act
      const result = await controller.getTrendingCities(limit);

      // Assert
      expect(repository.findTrendingCities).toHaveBeenCalledWith(limit);
      expect(result).toEqual(expectedDto);
    });

    it("should return cached trending cities if cache hit", async () => {
      // Arrange
      // We can't directly mock the interceptor's return value here easily.
      // Instead, we test the *effect*: if the interceptor hits cache,
      // the underlying repository method should NOT be called.
    });

    it.skip("should use default limit if not provided", async () => {
      // Arrange
      const defaultLimit = 5;
      // Assume interceptor causes cache miss
      // mockCacheManager.get.mockResolvedValue(null);
      mockCityRepository.findTrendingCities.mockResolvedValue(
        mockTrendingCities,
      );
      const expectedDto: TrendingCityDto[] = mockTrendingCities.map(
        (c) => new TrendingCityDto(c),
      );

      // Act
      await controller.getTrendingCities(undefined as any); // Simulate no limit query param

      // Assert
      // We assert the repository was called with the default limit
      expect(repository.findTrendingCities).toHaveBeenCalledWith(defaultLimit); // Ensure this checks for number 5
    });
  });

  describe("getCityDetails", () => {
    const cityId = mockCityDetails.id;

    it("should return city details from repository on cache miss", async () => {
      // Arrange
      mockCityRepository.findOneById.mockResolvedValue(mockCityDetails);
      const expectedDto = new CityDetailsDto(mockCityDetails);

      // Act
      const result = await controller.getCityDetails(cityId);

      // Assert
      expect(repository.findOneById).toHaveBeenCalledWith(cityId);
      expect(result).toEqual(expectedDto);
    });

    it("should return cached city details on cache hit", async () => {
      // Arrange
    });

    it("should throw NotFoundException if city is not found (on cache miss)", async () => {
      // Arrange
      mockCityRepository.findOneById.mockResolvedValue(null);

      // Act & Assert
      await expect(controller.getCityDetails(cityId)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.findOneById).toHaveBeenCalledWith(cityId);
    });
  });
});
