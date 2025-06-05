import { Test, TestingModule } from "@nestjs/testing";
import { RpcException } from "@nestjs/microservices";
import { Logger } from "@nestjs/common";
import { CityService } from "../../services/city.service";
import { CityRepository } from "../../repositories/city.repository";
import { City } from "../../entities/city.entity";

// Mocks
const mockCityRepository = {
  findOrCreateByNameAndCountry: jest.fn(),
  findOneById: jest.fn(),
  updateTrendingScore: jest.fn(),
};

// Mock Data
const mockCity: City = {
  id: "city-uuid-1",
  name: "Testopolis",
  countryCode: "TX",
  location: "POINT(1 2)",
  planCount: 5,
} as City;

const findOrCreatePayload = {
  name: "Testopolis",
  countryCode: "TX",
  location: { type: "Point" as const, coordinates: [1, 2] },
};

describe("CityService", () => {
  let service: CityService;
  let repository: CityRepository;

  // Suppress console logs during tests if necessary
  // jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  // jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
  // jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CityService,
        { provide: CityRepository, useValue: mockCityRepository },
        // Logger is instantiated directly
      ],
    }).compile();

    service = module.get<CityService>(CityService);
    repository = module.get<CityRepository>(CityRepository);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("handleFindOrCreateCity (RPC Handler)", () => {
    it("should call repository and return city on success", async () => {
      // Arrange
      mockCityRepository.findOrCreateByNameAndCountry.mockResolvedValue(
        mockCity,
      );

      // Act
      const result = await service.handleFindOrCreateCity(findOrCreatePayload);

      // Assert
      expect(result).toEqual(mockCity);
      expect(repository.findOrCreateByNameAndCountry).toHaveBeenCalledWith(
        findOrCreatePayload.name,
        findOrCreatePayload.countryCode,
        findOrCreatePayload.location,
      );
    });

    it("should throw RpcException if repository fails", async () => {
      // Arrange
      const repoError = new Error("Database error");
      mockCityRepository.findOrCreateByNameAndCountry.mockRejectedValue(
        repoError,
      );

      // Act & Assert
      await expect(
        service.handleFindOrCreateCity(findOrCreatePayload),
      ).rejects.toThrow(RpcException);
      await expect(
        service.handleFindOrCreateCity(findOrCreatePayload),
      ).rejects.toThrow(`Failed to find or create city: ${repoError.message}`);
      expect(repository.findOrCreateByNameAndCountry).toHaveBeenCalledWith(
        findOrCreatePayload.name,
        findOrCreatePayload.countryCode,
        findOrCreatePayload.location,
      );
    });

    it("should throw RpcException if name is missing", async () => {
      const invalidPayload = { ...findOrCreatePayload, name: undefined } as any;
      await expect(
        service.handleFindOrCreateCity(invalidPayload),
      ).rejects.toThrow(RpcException);
      await expect(
        service.handleFindOrCreateCity(invalidPayload),
      ).rejects.toThrow(
        "Failed to find or create city: Missing required fields: name and countryCode",
      );
    });

    it("should throw RpcException if countryCode is missing", async () => {
      const invalidPayload = {
        ...findOrCreatePayload,
        countryCode: undefined,
      } as any;
      await expect(
        service.handleFindOrCreateCity(invalidPayload),
      ).rejects.toThrow(RpcException);
      await expect(
        service.handleFindOrCreateCity(invalidPayload),
      ).rejects.toThrow(
        "Failed to find or create city: Missing required fields: name and countryCode",
      );
    });
  });

  describe("calculateAndSaveTrendingScore", () => {
    it("should calculate score and call repository update", async () => {
      // Arrange
      const cityId = "city-uuid-1";
      const expectedScore = 5; // Based on mockCity.planCount
      mockCityRepository.findOneById.mockResolvedValue(mockCity);

      // Act
      await service.calculateAndSaveTrendingScore(cityId);

      // Assert
      expect(repository.findOneById).toHaveBeenCalledWith(cityId);
      expect(repository.updateTrendingScore).toHaveBeenCalledWith(
        cityId,
        expectedScore,
      );
    });

    it("should not update score if city not found", async () => {
      // Arrange
      const cityId = "city-uuid-not-found";
      mockCityRepository.findOneById.mockResolvedValue(null);

      // Act
      await service.calculateAndSaveTrendingScore(cityId);

      // Assert
      expect(repository.findOneById).toHaveBeenCalledWith(cityId);
      expect(repository.updateTrendingScore).not.toHaveBeenCalled();
    });
  });

  // No tests for event listeners as they are not implemented in this service
});
