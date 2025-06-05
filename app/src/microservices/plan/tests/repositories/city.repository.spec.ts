import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ClientProxy } from "@nestjs/microservices";
import { Repository } from "typeorm";
import { CityRepository } from "../../repositories/city.repository";
import { City } from "../../entities/city.entity";
import { ConfigService } from "@nestjs/config";
import { UpdateResult, FindManyOptions } from "typeorm";

// Mock TypeORM repository methods
const mockRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  findAndCount: jest.fn(),
  update: jest.fn(),
  increment: jest.fn(),
  find: jest.fn(),
  findOneBy: jest.fn(),
  // Add mock for createQueryBuilder if needed for complex queries like findCityByLocation
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  })),
};

// Mock ClientProxy
const mockEventClient = {
  emit: jest.fn(),
};

describe("CityRepository", () => {
  let repository: CityRepository;
  let dbRepository: Repository<City>;
  let eventClient: ClientProxy;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CityRepository,
        {
          provide: getRepositoryToken(City),
          useValue: mockRepository,
        },
        {
          provide: "PLAN_EVENTS_SERVICE", // Use the injection token string
          useValue: mockEventClient,
        },
        // Mock ConfigService if normalizeInput uses it (currently doesn't)
        // { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    repository = module.get<CityRepository>(CityRepository);
    dbRepository = module.get<Repository<City>>(getRepositoryToken(City));
    eventClient = module.get<ClientProxy>("PLAN_EVENTS_SERVICE");
  });

  it("should be defined", () => {
    expect(repository).toBeDefined();
    expect(dbRepository).toBeDefined();
    expect(eventClient).toBeDefined();
  });

  describe("findOrCreateByNameAndCountry", () => {
    const name = "Test City";
    const countryCode = "TC";
    const normalizedName = "test city";
    const normalizedCountryCode = "tc"; // Added for clarity in expectations
    const mockExistingCity = {
      id: "uuid-find",
      name: normalizedName,
      countryCode: normalizedCountryCode,
    } as City;
    const mockNewCityData = {
      name: normalizedName,
      countryCode: normalizedCountryCode,
    }; // Use normalized
    const mockSavedCity = { id: "uuid-create", ...mockNewCityData } as City;

    it("should return existing city if found", async () => {
      mockRepository.findOne.mockResolvedValue(mockExistingCity);

      const result = await repository.findOrCreateByNameAndCountry(
        name,
        countryCode,
      );

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { name: normalizedName, countryCode: normalizedCountryCode },
      });
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockEventClient.emit).not.toHaveBeenCalled();
      expect(result).toEqual(mockExistingCity);
    });

    it("should create, save, and return new city if not found, emitting event", async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockNewCityData); // mock the entity object before save
      mockRepository.save.mockResolvedValue(mockSavedCity); // mock the saved entity with ID

      const result = await repository.findOrCreateByNameAndCountry(
        name,
        countryCode,
      );

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { name: normalizedName, countryCode: normalizedCountryCode },
      });
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: normalizedName,
          countryCode: normalizedCountryCode,
        }),
      );
      expect(mockRepository.save).toHaveBeenCalledWith(mockNewCityData);
      expect(mockEventClient.emit).toHaveBeenCalledWith(
        "city.created",
        expect.objectContaining({
          cityId: mockSavedCity.id,
          name: mockSavedCity.name,
        }),
      );
      expect(result).toEqual(mockSavedCity);
    });

    it("should handle location data when creating city", async () => {
      const locationInput = { latitude: 10, longitude: 20 };
      const expectedPoint = { type: "Point", coordinates: [20, 10] }; // GeoJSON Point format

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockImplementation((data) => data);
      const mockSavedCityWithLocation = {
        ...mockSavedCity,
        location: locationInput,
      };
      mockRepository.save.mockResolvedValue(mockSavedCityWithLocation);

      await repository.findOrCreateByNameAndCountry(
        name,
        countryCode,
        locationInput as any,
      );

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { name: normalizedName, countryCode: normalizedCountryCode },
      });
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: normalizedName,
          countryCode: normalizedCountryCode,
          location: locationInput,
        }),
      );
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ location: locationInput }),
      );
      expect(mockEventClient.emit).toHaveBeenCalled();
    });

    it("should log and not throw if event emission fails", async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockNewCityData);
      mockRepository.save.mockResolvedValue(mockSavedCity);
      mockEventClient.emit.mockImplementation(() => {
        throw new Error("Redis connection failed");
      });
      const loggerSpy = jest.spyOn(repository["logger"], "error");

      await expect(
        repository.findOrCreateByNameAndCountry(name, countryCode),
      ).resolves.toEqual(mockSavedCity);

      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockEventClient.emit).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to emit city.created event"),
        expect.any(String), // Check for the stack trace string
      );
    });

    it("should log and handle unique constraint error (23505) by re-fetching", async () => {
      mockRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockSavedCity); // First find fails, second (refetch) succeeds
      mockRepository.create.mockReturnValue(mockNewCityData);
      const uniqueConstraintError = new Error("Unique constraint violation");
      (uniqueConstraintError as any).code = "23505"; // Simulate PG error code
      mockRepository.save.mockRejectedValue(uniqueConstraintError);
      const loggerWarnSpy = jest.spyOn(repository["logger"], "warn");

      const result = await repository.findOrCreateByNameAndCountry(
        name,
        countryCode,
      );

      expect(mockRepository.findOne).toHaveBeenCalledTimes(2); // Initial find + refetch
      expect(mockRepository.findOne).toHaveBeenNthCalledWith(1, {
        where: { name: normalizedName, countryCode: normalizedCountryCode },
      });
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: normalizedName,
          countryCode: normalizedCountryCode,
        }),
      );
      expect(mockRepository.save).toHaveBeenCalledWith(mockNewCityData);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Race condition likely"),
      );
      expect(mockRepository.findOne).toHaveBeenNthCalledWith(2, {
        where: { name: normalizedName, countryCode: normalizedCountryCode },
      });
      expect(mockEventClient.emit).not.toHaveBeenCalled(); // Event should not be emitted if save failed initially
      expect(result).toEqual(mockSavedCity); // Should return the re-fetched city
    });

    it("should throw other database save errors", async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockNewCityData);
      const dbError = new Error("Generic DB Error");
      mockRepository.save.mockRejectedValue(dbError);
      const loggerErrorSpy = jest.spyOn(repository["logger"], "error");

      await expect(
        repository.findOrCreateByNameAndCountry(name, countryCode),
      ).rejects.toThrow(dbError);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { name: normalizedName, countryCode: normalizedCountryCode },
      });
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: normalizedName,
          countryCode: normalizedCountryCode,
        }),
      );
      expect(mockRepository.save).toHaveBeenCalledWith(mockNewCityData);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to create city"),
        expect.any(String),
      );
      expect(mockEventClient.emit).not.toHaveBeenCalled();
    });
  });

  describe("findByNameAndCountry", () => {
    const name = "Lookup City";
    const countryCode = "LC";
    const normalizedName = "lookup city";
    const normalizedCountryCode = "lc"; // Added for clarity
    const mockCity = {
      id: "uuid-lookup",
      name: normalizedName,
      countryCode: normalizedCountryCode,
    } as City;

    it("should find and return a city by normalized name and country code", async () => {
      mockRepository.findOne.mockResolvedValue(mockCity);
      const result = await repository.findByNameAndCountry(name, countryCode);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { name: normalizedName, countryCode: normalizedCountryCode },
      });
      expect(result).toEqual(mockCity);
    });

    it("should return null if city is not found", async () => {
      mockRepository.findOne.mockResolvedValue(null);
      const result = await repository.findByNameAndCountry(name, countryCode);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { name: normalizedName, countryCode: normalizedCountryCode },
      });
      expect(result).toBeNull();
    });
  });

  describe("findCityByLocation", () => {
    const locationInput: { type: "Point"; coordinates: number[] } = {
      type: "Point",
      coordinates: [30, 40],
    }; // lon, lat
    const mockCity = {
      id: "uuid-location",
      name: "Located City",
      countryCode: "LC",
    } as City;
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    beforeEach(() => {
      // Reset query builder mocks for each test
      jest.clearAllMocks();
      // Ensure createQueryBuilder returns the mock with chainable methods
      mockRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder);
    });

    it("should use query builder with ST_DWithin and ST_Distance", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockCity);

      const result = await repository.findCityByLocation(locationInput);

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("city");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        expect.stringContaining("ST_DWithin"),
        expect.objectContaining({
          lon: locationInput.coordinates[0],
          lat: locationInput.coordinates[1],
          radius: expect.any(Number), // Default radius
        }),
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        expect.stringContaining("ST_Distance"),
        "ASC",
      );
      expect(mockQueryBuilder.getOne).toHaveBeenCalled();
      expect(result).toEqual(mockCity);
    });

    it("should return null if no city found by location", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);
      const result = await repository.findCityByLocation(locationInput);
      expect(mockQueryBuilder.getOne).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe("incrementPlanCount", () => {
    const cityId = "uuid-increment";
    const amount = 1;

    it("should call repository.increment with correct arguments", async () => {
      mockRepository.increment.mockResolvedValue({
        affected: 1,
        raw: {},
        generatedMaps: [],
      });
      await repository.incrementPlanCount(cityId, amount);
      expect(mockRepository.increment).toHaveBeenCalledWith(
        { id: cityId },
        "planCount",
        amount,
      );
    });

    it("should handle negative amount correctly", async () => {
      const decrementAmount = -1;
      mockRepository.increment.mockResolvedValue({
        affected: 1,
        raw: {},
        generatedMaps: [],
      });
      await repository.incrementPlanCount(cityId, decrementAmount);
      expect(mockRepository.increment).toHaveBeenCalledWith(
        { id: cityId },
        "planCount",
        decrementAmount,
      );
    });

    // Add test for error propagation if needed
  });

  describe("updateTrendingScore", () => {
    it("should call repository.update with correct arguments", async () => {
      const cityId = "uuid-trending";
      const score = 99.5;
      mockRepository.update.mockResolvedValue({
        affected: 1,
        raw: {},
        generatedMaps: [],
      });
      await repository.updateTrendingScore(cityId, score);
      // Expect the criteria object, not just the ID string
      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: cityId },
        { trendingScore: score },
      );
    });
    // Add test for error propagation if needed
  });

  describe("findTrendingCities", () => {
    const limit = 5;
    const mockTrendingCities = [
      { id: "city-t1", name: "Trend1", trendingScore: 100 } as City,
      { id: "city-t2", name: "Trend2", trendingScore: 90 } as City,
    ];

    it("should call repository.find with correct options", async () => {
      mockRepository.find.mockResolvedValue(mockTrendingCities);
      const result = await repository.findTrendingCities(limit);
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { trendingScore: "DESC" },
        take: limit,
        // Add relations if needed by DTO later: relations: ['...?']
      });
      expect(result).toEqual(mockTrendingCities);
    });

    it("should return empty array if no cities found", async () => {
      mockRepository.find.mockResolvedValue([]);
      const result = await repository.findTrendingCities(limit);
      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: limit }),
      );
      expect(result).toEqual([]);
    });
    // Add test for error propagation if needed
  });

  describe("updateImageUrl", () => {
    it("should call repository.update with correct arguments", async () => {
      const cityId = "uuid-image";
      const imageUrl = "http://new.image/url.jpg";
      mockRepository.update.mockResolvedValue({
        affected: 1,
        raw: {},
        generatedMaps: [],
      });
      await repository.updateImageUrl(cityId, imageUrl);
      // Expect the criteria object, not just the ID string
      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: cityId },
        { imageUrl: imageUrl },
      );
    });
    // Add test for error propagation if needed
  });

  describe("findOneById", () => {
    const cityId = "uuid-findOne";
    const mockCity = { id: cityId, name: "FindOne City" } as City;

    it("should call repository.findOneBy with the id", async () => {
      mockRepository.findOneBy.mockResolvedValue(mockCity);
      const result = await repository.findOneById(cityId);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: cityId });
      expect(result).toEqual(mockCity);
    });

    it("should return null if city not found by id", async () => {
      mockRepository.findOneBy.mockResolvedValue(null);
      const result = await repository.findOneById(cityId);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: cityId });
      expect(result).toBeNull();
    });
  });

  describe("findAll", () => {
    const mockCities = [{ id: "c1" }, { id: "c2" }] as City[];
    const findOptions: FindManyOptions<City> = { where: { countryCode: "XX" } };

    it("should call repository.find without options", async () => {
      mockRepository.find.mockResolvedValue(mockCities);
      const result = await repository.findAll();
      expect(mockRepository.find).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockCities);
    });

    it("should call repository.find with provided options", async () => {
      mockRepository.find.mockResolvedValue([mockCities[0]]); // Assume options filter results
      const result = await repository.findAll(findOptions);
      expect(mockRepository.find).toHaveBeenCalledWith(findOptions);
      expect(result).toEqual([mockCities[0]]);
    });
  });
});
