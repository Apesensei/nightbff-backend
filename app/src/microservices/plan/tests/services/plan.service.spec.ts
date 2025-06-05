import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ClientProxy } from "@nestjs/microservices";
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { PlanService } from "../../plan.service";
import { PlanRepository } from "../../repositories/plan.repository";
import { CityRepository } from "../../repositories/city.repository";
import { PlanUserRepository } from "../../repositories/plan-user.repository";
import { GoogleMapsService } from "@/microservices/venue/services/google-maps.service";
import { Plan } from "../../entities/plan.entity";
import { City } from "../../entities/city.entity";
import { PlanUser } from "../../entities/plan-user.entity";
import { v4 as uuidv4 } from "uuid";

// Mock dependencies
const mockPlanRepository = {
  create: jest.fn(),
  findOneById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  incrementSaveCount: jest.fn(),
  decrementSaveCount: jest.fn(),
};

const mockCityRepository = {
  findByNameAndCountry: jest.fn(),
  findOrCreateByNameAndCountry: jest.fn(),
};

const mockPlanUserRepository = {
  savePlan: jest.fn(),
  unsavePlan: jest.fn(),
};

const mockGoogleMapsService = {
  geocodeAddress: jest.fn(),
  parseGeocodeResult: jest.fn(), // Assuming a parsing helper might exist or be needed
};

const mockEventClient = {
  emit: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
};

// Mock City object
const mockCityEntity: City = {
  id: "city-uuid-123",
  name: "test city", // Use normalized name for consistency with repo expectations
  countryCode: "TC",
  location: "POINT(1 2)", // Example WKT
  createdAt: new Date(),
  updatedAt: new Date(),
  trendingScore: 0,
  planCount: 0,
  flagEmoji: "🏁",
  imageUrl: undefined,
};

// Mock Plan object
const mockPlanEntity: Plan = {
  id: "plan-uuid-123",
  creatorId: "user-uuid-456",
  cityId: mockCityEntity.id,
  startDate: new Date(),
  saveCount: 0,
  viewCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  city: mockCityEntity,
  venueId: undefined,
  endDate: undefined,
  coverImage: undefined,
};

// Realistic mock for Google Maps API geocode result structure
const mockGeocodeApiResponse: any = {
  address_components: [
    {
      long_name: "Test City",
      short_name: "Test City",
      types: ["locality", "political"],
    },
    {
      long_name: "Test County",
      short_name: "TC County",
      types: ["administrative_area_level_2", "political"],
    },
    {
      long_name: "Test State",
      short_name: "TS",
      types: ["administrative_area_level_1", "political"],
    },
    {
      long_name: "Test Country",
      short_name: "TC",
      types: ["country", "political"],
    },
  ],
  formatted_address: "Test City, TS, Test Country",
  geometry: {
    location: { lat: 1, lng: 2 },
    location_type: "APPROXIMATE",
    viewport: {
      northeast: { lat: 1.1, lng: 2.1 },
      southwest: { lat: 0.9, lng: 1.9 },
    },
  },
  place_id: "google-place-id",
  types: ["locality", "political"],
  latitude: 1,
  longitude: 2,
};

describe("PlanService", () => {
  let service: PlanService;
  let planRepository: PlanRepository;
  let cityRepository: CityRepository;
  let planUserRepository: PlanUserRepository;
  let googleMapsService: GoogleMapsService;
  let eventClient: ClientProxy;
  let configService: ConfigService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanService,
        { provide: PlanRepository, useValue: mockPlanRepository },
        { provide: CityRepository, useValue: mockCityRepository },
        { provide: PlanUserRepository, useValue: mockPlanUserRepository },
        { provide: GoogleMapsService, useValue: mockGoogleMapsService },
        { provide: "PLAN_EVENTS_SERVICE", useValue: mockEventClient },
        { provide: ConfigService, useValue: mockConfigService },
        // Logger is instantiated directly in the service, so not mocked here
      ],
    }).compile();

    service = module.get<PlanService>(PlanService);
    planRepository = module.get<PlanRepository>(PlanRepository);
    cityRepository = module.get<CityRepository>(CityRepository);
    planUserRepository = module.get<PlanUserRepository>(PlanUserRepository);
    googleMapsService = module.get<GoogleMapsService>(GoogleMapsService);
    eventClient = module.get<ClientProxy>("PLAN_EVENTS_SERVICE");
    configService = module.get<ConfigService>(ConfigService);

    // Mock the internal parseGeocodeResult if needed for tests
    // For simplicity, we'll assume geocodeAddress returns parsed data or handle parsing in tests
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // --- Tests for createPlan and _resolveCity --- //
  describe("createPlan", () => {
    const userId = "user-uuid-456";
    const createPlanDto: { destination: string; startDate: Date } = {
      destination: "Test City, TC",
      startDate: new Date(),
    };
    const parsedCityName = "Test City";
    const parsedCountryCode = "TC";
    const parsedLocation = { type: "Point" as const, coordinates: [2, 1] }; // lng, lat
    const createdPlan = { ...mockPlanEntity, id: "new-plan-uuid" };

    // --- Test cases covering _resolveCity logic indirectly --- //

    it("should create plan successfully when geocoding resolves to an existing city via findOrCreate", async () => {
      // Arrange: _resolveCity path -> geocode succeeds -> findOrCreate returns existing city
      mockGoogleMapsService.geocodeAddress.mockResolvedValue(
        mockGeocodeApiResponse,
      ); // Geocode must succeed
      mockCityRepository.findOrCreateByNameAndCountry.mockResolvedValue(
        mockCityEntity,
      ); // Repo returns existing city
      mockPlanRepository.create.mockResolvedValue(createdPlan);
      mockPlanRepository.findOneById.mockResolvedValue(createdPlan);

      // Act
      const result = await service.createPlan(userId, createPlanDto);

      // Assert
      // expect(mockCityRepository.findByNameAndCountry).toHaveBeenCalledWith('Test City', 'TC'); // Local find is bypassed
      expect(mockGoogleMapsService.geocodeAddress).toHaveBeenCalledWith(
        createPlanDto.destination,
      );
      expect(
        mockCityRepository.findOrCreateByNameAndCountry,
      ).toHaveBeenCalledWith(parsedCityName, parsedCountryCode, parsedLocation);
      expect(mockPlanRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          creatorId: userId,
          cityId: mockCityEntity.id,
          startDate: createPlanDto.startDate,
        }),
      );
      expect(mockEventClient.emit).toHaveBeenCalledWith(
        "plan.created",
        expect.objectContaining({
          planId: createdPlan.id,
          cityId: mockCityEntity.id,
          creatorId: userId,
        }),
      );
      expect(result).toEqual(createdPlan);
    });

    it("should create plan successfully (geocode -> findOrCreate creates new city)", async () => {
      // Arrange: _resolveCity path -> geocode succeeds -> findOrCreate succeeds (creates new)
      const newCityCreated = { ...mockCityEntity, id: "new-city-uuid" };
      mockGoogleMapsService.geocodeAddress.mockResolvedValue(
        mockGeocodeApiResponse,
      );
      mockCityRepository.findOrCreateByNameAndCountry.mockResolvedValue(
        newCityCreated,
      ); // findOrCreate creates new
      mockPlanRepository.create.mockResolvedValue(createdPlan);
      mockPlanRepository.findOneById.mockResolvedValue(createdPlan);

      // Act
      const result = await service.createPlan(userId, createPlanDto);

      // Assert
      expect(mockGoogleMapsService.geocodeAddress).toHaveBeenCalledWith(
        createPlanDto.destination,
      );
      expect(
        mockCityRepository.findOrCreateByNameAndCountry,
      ).toHaveBeenCalledWith(parsedCityName, parsedCountryCode, parsedLocation);
      expect(mockPlanRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ cityId: newCityCreated.id }),
      );
      expect(mockEventClient.emit).toHaveBeenCalledWith(
        "plan.created",
        expect.objectContaining({ cityId: newCityCreated.id }),
      );
      expect(result).toEqual(createdPlan);
    });

    // TODO: Add tests for geocode parsing failure within _resolveCity
    // This requires mocking geocodeAddress to return incomplete/malformed data
    // and asserting that createPlan throws BadRequestException
    it("should throw BadRequestException if geocode result parsing fails (missing locality/city)", async () => {
      // Arrange
      const faultyGeocodeResponse = {
        ...mockGeocodeApiResponse, // Start with valid structure
        address_components: [
          // Missing locality type AND administrative_area_level_1
          {
            long_name: "Test County",
            short_name: "TC County",
            types: ["administrative_area_level_2", "political"],
          },
          {
            long_name: "Test Country",
            short_name: "TC",
            types: ["country", "political"],
          },
        ],
      };
      mockGoogleMapsService.geocodeAddress.mockResolvedValue(
        faultyGeocodeResponse as any,
      );
      // Explicitly mock findOrCreate to ensure it's not called and resolving unexpectedly
      mockCityRepository.findOrCreateByNameAndCountry.mockRejectedValue(
        new Error("Should not be called"),
      );
      mockPlanRepository.create.mockRejectedValue(
        new Error("Should not be called"),
      );

      // Act & Assert
      try {
        console.log("TEST: Calling service.createPlan...");
        await service.createPlan(userId, createPlanDto);
        console.log("TEST: service.createPlan unexpectedly resolved");
        // Fail test explicitly if it resolves
        fail("Expected createPlan to reject, but it resolved.");
      } catch (error) {
        console.log("TEST: service.createPlan threw error:", error.message);
        // Check the error type and message more precisely
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toMatch(
          /Could not resolve city\/country for destination/,
        );
      }

      // Verify mocks
      expect(mockGoogleMapsService.geocodeAddress).toHaveBeenCalledWith(
        createPlanDto.destination,
      );
      expect(
        mockCityRepository.findOrCreateByNameAndCountry,
      ).not.toHaveBeenCalled();
      expect(mockPlanRepository.create).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException if geocode result parsing fails (missing country)", async () => {
      // Arrange
      const faultyGeocodeResponse = {
        ...mockGeocodeApiResponse,
        address_components: [
          {
            long_name: "Test City",
            short_name: "Test City",
            types: ["locality", "political"],
          },
          // Missing country type
          {
            long_name: "Test State",
            short_name: "TS",
            types: ["administrative_area_level_1", "political"],
          },
        ],
      };
      mockGoogleMapsService.geocodeAddress.mockResolvedValue(
        faultyGeocodeResponse as any,
      );

      // Act & Assert
      await expect(service.createPlan(userId, createPlanDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createPlan(userId, createPlanDto)).rejects.toThrow(
        /Could not resolve city\/country for destination/,
      );
      expect(mockGoogleMapsService.geocodeAddress).toHaveBeenCalledWith(
        createPlanDto.destination,
      );
      expect(
        mockCityRepository.findOrCreateByNameAndCountry,
      ).not.toHaveBeenCalled();
    });

    it("should throw Error if city resolution fails during findOrCreate", async () => {
      // Arrange: _resolveCity path -> geocode succeeds -> findOrCreate fails
      mockGoogleMapsService.geocodeAddress.mockResolvedValue(
        mockGeocodeApiResponse,
      );
      const findOrCreateError = new Error("DB error during findOrCreate");
      mockCityRepository.findOrCreateByNameAndCountry.mockRejectedValue(
        findOrCreateError,
      );

      // Act & Assert
      // Expect the generic Error thrown by the catch block in _resolveCity
      await expect(service.createPlan(userId, createPlanDto)).rejects.toThrow(
        "Failed to save city information.",
      );
      expect(
        mockCityRepository.findOrCreateByNameAndCountry,
      ).toHaveBeenCalled();
      expect(mockPlanRepository.create).not.toHaveBeenCalled();
    });

    it("should throw Error if plan repository create fails", async () => {
      // Arrange: Geocoding and city resolution succeed
      mockGoogleMapsService.geocodeAddress.mockResolvedValue(
        mockGeocodeApiResponse,
      );
      mockCityRepository.findOrCreateByNameAndCountry.mockResolvedValue(
        mockCityEntity,
      );
      const createError = new Error("DB error during create");
      mockPlanRepository.create.mockRejectedValue(createError);

      // Act & Assert
      // Expect the generic Error thrown by the catch block in createPlan
      await expect(service.createPlan(userId, createPlanDto)).rejects.toThrow(
        "Failed to create plan.",
      );
      expect(mockPlanRepository.create).toHaveBeenCalled();
      expect(mockEventClient.emit).not.toHaveBeenCalled();
    });

    it("should create plan but not throw if event emission fails", async () => {
      // Arrange: Everything succeeds except event emission
      mockGoogleMapsService.geocodeAddress.mockResolvedValue(
        mockGeocodeApiResponse,
      );
      mockCityRepository.findOrCreateByNameAndCountry.mockResolvedValue(
        mockCityEntity,
      );
      mockPlanRepository.create.mockResolvedValue(createdPlan);
      mockPlanRepository.findOneById.mockResolvedValue(createdPlan);
      const emitError = new Error("Redis connection failed");
      mockEventClient.emit.mockImplementation(() => {
        throw emitError;
      });

      // Act: Should complete without throwing
      const result = await service.createPlan(userId, createPlanDto);

      // Assert
      expect(mockPlanRepository.create).toHaveBeenCalled();
      expect(mockEventClient.emit).toHaveBeenCalled(); // Emit was attempted
      expect(result).toEqual(createdPlan); // Plan creation still succeeded
    });
  });

  // --- Tests for other methods (getPlanById, updatePlan, deletePlan, save/unsave) --- //
  describe("getPlanById", () => {
    const planId = "plan-uuid-123";

    it("should find and return a plan by ID and emit viewed event", async () => {
      // Arrange
      mockPlanRepository.findOneById.mockResolvedValue(mockPlanEntity);

      // Act
      const result = await service.getPlanById(planId);

      // Assert
      expect(mockPlanRepository.findOneById).toHaveBeenCalledWith(planId, {
        relations: ["city"],
      });
      expect(result).toEqual(mockPlanEntity);
      // Verify event emission (simple check that emit was called)
      expect(mockEventClient.emit).toHaveBeenCalledWith(
        "plan.viewed",
        expect.objectContaining({
          planId: mockPlanEntity.id,
          cityId: mockPlanEntity.cityId,
        }),
      );
    });

    it("should throw NotFoundException if plan is not found", async () => {
      // Arrange
      mockPlanRepository.findOneById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getPlanById(planId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPlanRepository.findOneById).toHaveBeenCalledWith(planId, {
        relations: ["city"],
      });
      expect(mockEventClient.emit).not.toHaveBeenCalled(); // No event if not found
    });

    it("should emit viewed event even if emission fails (fire-and-forget)", async () => {
      // Arrange
      mockPlanRepository.findOneById.mockResolvedValue(mockPlanEntity);
      const emitError = new Error("Emit failed");
      mockEventClient.emit.mockImplementation(() => {
        throw emitError;
      });
      // We don't assert logger calls, just ensure the main call doesn't throw

      // Act
      const result = await service.getPlanById(planId);

      // Assert
      expect(result).toEqual(mockPlanEntity); // Should still return the plan
      expect(mockEventClient.emit).toHaveBeenCalledWith(
        "plan.viewed",
        expect.objectContaining({
          planId: mockPlanEntity.id,
          cityId: mockPlanEntity.cityId,
        }),
      );
    });
  });

  // --- Tests for updatePlan --- //
  describe("updatePlan", () => {
    const planId = mockPlanEntity.id;
    const userId = mockPlanEntity.creatorId; // Assume authorized user by default
    const updateDto: { coverImage?: string } = {
      coverImage: "new-cover.jpg",
    };
    const updatedPlanData = {
      ...mockPlanEntity,
      coverImage: updateDto.coverImage,
      updatedAt: new Date(), // Simulate update timestamp
    };

    it("should update plan successfully for the creator", async () => {
      // Arrange: Find succeeds, user is creator, update succeeds, refetch succeeds
      mockPlanRepository.findOneById.mockResolvedValueOnce(mockPlanEntity); // Initial find
      mockPlanRepository.update.mockResolvedValue({
        affected: 1,
        raw: {},
        generatedMaps: [],
      }); // Mock successful update
      // Mock the findOneById call made by getPlanById *after* the update
      mockPlanRepository.findOneById.mockResolvedValueOnce(updatedPlanData);

      // Act
      const result = await service.updatePlan(planId, userId, updateDto);

      // Assert
      expect(mockPlanRepository.findOneById).toHaveBeenCalledWith(planId);
      expect(mockPlanRepository.update).toHaveBeenCalledWith(planId, updateDto);
      expect(mockPlanRepository.findOneById).toHaveBeenCalledWith(planId, {
        relations: ["city"],
      }); // Check refetch call
      expect(mockEventClient.emit).toHaveBeenCalledWith(
        "plan.viewed",
        expect.anything(),
      ); // getPlanById emits this
      expect(result).toEqual(updatedPlanData);
    });

    it("should throw NotFoundException if plan to update is not found", async () => {
      // Arrange
      mockPlanRepository.findOneById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updatePlan(planId, userId, updateDto),
      ).rejects.toThrow(NotFoundException);
      expect(mockPlanRepository.update).not.toHaveBeenCalled();
    });

    it("should throw ForbiddenException if user is not the creator", async () => {
      // Arrange
      const nonCreatorUserId = "another-user-uuid";
      mockPlanRepository.findOneById.mockResolvedValue(mockPlanEntity); // Plan found

      // Act & Assert
      await expect(
        service.updatePlan(planId, nonCreatorUserId, updateDto),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPlanRepository.update).not.toHaveBeenCalled();
    });

    it("should throw generic Error if plan repository update fails", async () => {
      // Arrange: Find succeeds, user is creator, update fails
      mockPlanRepository.findOneById.mockResolvedValue(mockPlanEntity);
      const updateError = new Error("DB update error");
      mockPlanRepository.update.mockRejectedValue(updateError);

      // Act & Assert
      await expect(
        service.updatePlan(planId, userId, updateDto),
      ).rejects.toThrow("Failed to update plan.");
      expect(mockPlanRepository.update).toHaveBeenCalledWith(planId, updateDto);
    });

    it("should throw generic Error if refetch after update fails", async () => {
      // Arrange: Find succeeds, user is creator, update succeeds, refetch fails
      mockPlanRepository.findOneById.mockResolvedValueOnce(mockPlanEntity); // Initial find
      mockPlanRepository.update.mockResolvedValue({
        affected: 1,
        raw: {},
        generatedMaps: [],
      }); // Update succeeds
      const refetchError = new Error("DB find error after update");
      // Mock the findOneById call made by getPlanById *after* the update to fail
      mockPlanRepository.findOneById.mockRejectedValueOnce(refetchError);

      // Act & Assert
      await expect(
        service.updatePlan(planId, userId, updateDto),
      ).rejects.toThrow("Failed to update plan.");
      expect(mockPlanRepository.update).toHaveBeenCalledWith(planId, updateDto);
      expect(mockPlanRepository.findOneById).toHaveBeenCalledWith(planId, {
        relations: ["city"],
      }); // Refetch was attempted
    });
  });

  // --- Tests for deletePlan --- //
  describe("deletePlan", () => {
    const planId = mockPlanEntity.id;
    const userId = mockPlanEntity.creatorId; // Assume authorized user

    it("should delete plan successfully for the creator and emit event", async () => {
      // Arrange
      mockPlanRepository.findOneById.mockResolvedValue(mockPlanEntity);
      mockPlanRepository.delete.mockResolvedValue({ affected: 1, raw: {} });

      // Act
      await service.deletePlan(planId, userId);

      // Assert
      expect(mockPlanRepository.findOneById).toHaveBeenCalledWith(planId);
      expect(mockPlanRepository.delete).toHaveBeenCalledWith(planId);
      expect(mockEventClient.emit).toHaveBeenCalledWith(
        "plan.deleted",
        expect.objectContaining({
          planId: planId,
          cityId: mockPlanEntity.cityId,
          userId: userId,
        }),
      );
    });

    it("should throw NotFoundException if plan to delete is not found", async () => {
      // Arrange
      mockPlanRepository.findOneById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deletePlan(planId, userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPlanRepository.delete).not.toHaveBeenCalled();
      expect(mockEventClient.emit).not.toHaveBeenCalled();
    });

    it("should throw ForbiddenException if user is not the creator", async () => {
      // Arrange
      const nonCreatorUserId = "another-user-uuid";
      mockPlanRepository.findOneById.mockResolvedValue(mockPlanEntity);

      // Act & Assert
      await expect(
        service.deletePlan(planId, nonCreatorUserId),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPlanRepository.delete).not.toHaveBeenCalled();
      expect(mockEventClient.emit).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException if delete operation affects 0 rows", async () => {
      // Arrange: Plan found, user is creator, but delete returns affected: 0
      mockPlanRepository.findOneById.mockResolvedValue(mockPlanEntity);
      mockPlanRepository.delete.mockResolvedValue({ affected: 0, raw: {} });

      // Act & Assert
      await expect(service.deletePlan(planId, userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.deletePlan(planId, userId)).rejects.toThrow(
        /could not be deleted/,
      );
      expect(mockPlanRepository.delete).toHaveBeenCalledWith(planId);
      expect(mockEventClient.emit).not.toHaveBeenCalled(); // Event not emitted if delete fails
    });

    it("should delete plan but not throw if event emission fails", async () => {
      // Arrange
      mockPlanRepository.findOneById.mockResolvedValue(mockPlanEntity);
      mockPlanRepository.delete.mockResolvedValue({ affected: 1, raw: {} });
      const emitError = new Error("Emit failed");
      mockEventClient.emit.mockImplementation(() => {
        throw emitError;
      });

      // Act: Should complete without throwing
      await service.deletePlan(planId, userId);

      // Assert
      expect(mockPlanRepository.delete).toHaveBeenCalledWith(planId);
      expect(mockEventClient.emit).toHaveBeenCalled(); // Emit was attempted
    });
  });

  // --- Tests for savePlanForUser --- //
  describe("savePlanForUser", () => {
    const planId = mockPlanEntity.id;
    const userId = "test-user-whosaving";
    const mockSavedRelation: PlanUser = {
      id: "plan-user-rel-uuid",
      planId: planId,
      userId: userId,
      createdAt: new Date(),
      plan: mockPlanEntity,
    };

    it("should save plan for user and increment count successfully", async () => {
      // Arrange
      mockPlanRepository.findOneById.mockResolvedValue(mockPlanEntity);
      mockPlanUserRepository.savePlan.mockResolvedValue(mockSavedRelation);
      mockPlanRepository.incrementSaveCount.mockResolvedValue({
        affected: 1,
        raw: {},
        generatedMaps: [],
      });

      // Act
      await service.savePlanForUser(planId, userId);

      // Assert
      expect(mockPlanRepository.findOneById).toHaveBeenCalledWith(planId);
      expect(mockPlanUserRepository.savePlan).toHaveBeenCalledWith(
        planId,
        userId,
      );
      expect(mockPlanRepository.incrementSaveCount).toHaveBeenCalledWith(
        planId,
        1,
      );
    });

    it("should throw NotFoundException if plan does not exist", async () => {
      // Arrange
      mockPlanRepository.findOneById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.savePlanForUser(planId, userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPlanUserRepository.savePlan).not.toHaveBeenCalled();
      expect(mockPlanRepository.incrementSaveCount).not.toHaveBeenCalled();
    });

    it("should propagate error if planUserRepository.savePlan fails", async () => {
      // Arrange
      mockPlanRepository.findOneById.mockResolvedValue(mockPlanEntity);
      const saveError = new Error("Failed to save relation");
      mockPlanUserRepository.savePlan.mockRejectedValue(saveError);

      // Act & Assert
      await expect(service.savePlanForUser(planId, userId)).rejects.toThrow(
        saveError,
      );
      expect(mockPlanRepository.incrementSaveCount).not.toHaveBeenCalled();
    });

    it("should not increment count if planUserRepository.savePlan returns falsy", async () => {
      // Arrange: Test the 'if (savedRelation)' condition
      mockPlanRepository.findOneById.mockResolvedValue(mockPlanEntity);
      mockPlanUserRepository.savePlan.mockResolvedValue(null); // Simulate returning null/undefined

      // Act
      await service.savePlanForUser(planId, userId);

      // Assert
      expect(mockPlanRepository.findOneById).toHaveBeenCalledWith(planId);
      expect(mockPlanUserRepository.savePlan).toHaveBeenCalledWith(
        planId,
        userId,
      );
      expect(mockPlanRepository.incrementSaveCount).not.toHaveBeenCalled();
    });

    it("should propagate error if planRepository.incrementSaveCount fails", async () => {
      // Arrange
      mockPlanRepository.findOneById.mockResolvedValue(mockPlanEntity);
      mockPlanUserRepository.savePlan.mockResolvedValue(mockSavedRelation);
      const incrementError = new Error("Failed to increment count");
      mockPlanRepository.incrementSaveCount.mockRejectedValue(incrementError);

      // Act & Assert
      await expect(service.savePlanForUser(planId, userId)).rejects.toThrow(
        incrementError,
      );
      expect(mockPlanRepository.incrementSaveCount).toHaveBeenCalledWith(
        planId,
        1,
      );
    });
  });

  // TODO: Add tests for unsavePlanForUser
  describe("unsavePlanForUser", () => {
    const planId = mockPlanEntity.id;
    const userId = "test-user-whounsaving";

    it("should unsave plan for user and decrement count successfully", async () => {
      // Arrange
      mockPlanRepository.findOneById.mockResolvedValue(mockPlanEntity);
      mockPlanUserRepository.unsavePlan.mockResolvedValue({
        affected: 1,
        raw: {},
      });
      // Mock the actual method called by the service
      mockPlanRepository.incrementSaveCount.mockResolvedValue({
        affected: 1,
        raw: {},
        generatedMaps: [],
      });
      // Ensure decrementSaveCount mock doesn't interfere if it exists
      mockPlanRepository.decrementSaveCount.mockClear();

      // Act
      await service.unsavePlanForUser(planId, userId);

      // Assert
      expect(mockPlanRepository.findOneById).toHaveBeenCalledWith(planId);
      expect(mockPlanUserRepository.unsavePlan).toHaveBeenCalledWith(
        planId,
        userId,
      );
      // Assert the actual method called by the service
      expect(mockPlanRepository.incrementSaveCount).toHaveBeenCalledWith(
        planId,
        -1,
      );
      expect(mockPlanRepository.decrementSaveCount).not.toHaveBeenCalled(); // Verify wrong mock wasn't called
    });

    it("should throw NotFoundException if plan does not exist", async () => {
      // Arrange
      mockPlanRepository.findOneById.mockResolvedValue(null); // Plan not found

      // Act & Assert
      await expect(service.unsavePlanForUser(planId, userId)).rejects.toThrow(
        NotFoundException,
      ); // Service should now throw this
      expect(mockPlanUserRepository.unsavePlan).not.toHaveBeenCalled();
      expect(mockPlanRepository.decrementSaveCount).not.toHaveBeenCalled();
      expect(mockPlanRepository.incrementSaveCount).not.toHaveBeenCalled(); // Also check increment wasn't called
    });

    it("should throw generic Error if planUserRepository.unsavePlan fails", async () => {
      // Arrange
      mockPlanRepository.findOneById.mockResolvedValue(mockPlanEntity);
      const unsaveError = new Error("Failed to delete relation");
      mockPlanUserRepository.unsavePlan.mockRejectedValue(unsaveError);

      // Act & Assert
      await expect(service.unsavePlanForUser(planId, userId)).rejects.toThrow(
        "Failed to unsave plan.",
      ); // Expect the generic error from the service catch block
      expect(mockPlanRepository.decrementSaveCount).not.toHaveBeenCalled();
      expect(mockPlanRepository.incrementSaveCount).not.toHaveBeenCalled();
    });

    it("should not decrement count if user had not saved the plan (unsavePlan affects 0 rows)", async () => {
      // Arrange
      mockPlanRepository.findOneById.mockResolvedValue(mockPlanEntity);
      mockPlanUserRepository.unsavePlan.mockResolvedValue({
        affected: 0,
        raw: {},
      });

      // Act
      await service.unsavePlanForUser(planId, userId);

      // Assert
      expect(mockPlanRepository.findOneById).toHaveBeenCalledWith(planId);
      expect(mockPlanUserRepository.unsavePlan).toHaveBeenCalledWith(
        planId,
        userId,
      );
      expect(mockPlanRepository.decrementSaveCount).not.toHaveBeenCalled();
      expect(mockPlanRepository.incrementSaveCount).not.toHaveBeenCalled();
    });

    it("should throw generic Error if planRepository.incrementSaveCount fails", async () => {
      // Arrange
      mockPlanRepository.findOneById.mockResolvedValue(mockPlanEntity);
      mockPlanUserRepository.unsavePlan.mockResolvedValue({
        affected: 1,
        raw: {},
      });
      const incrementError = new Error("Failed to update count"); // Use a relevant error message
      // Mock the actual method called by the service to reject
      mockPlanRepository.incrementSaveCount.mockRejectedValue(incrementError);
      // Ensure decrementSaveCount mock doesn't interfere
      mockPlanRepository.decrementSaveCount.mockClear();

      // Act & Assert
      await expect(service.unsavePlanForUser(planId, userId)).rejects.toThrow(
        "Failed to unsave plan.",
      ); // Expect the generic error from the service catch block
      // Verify the correct method was called before the error was caught
      expect(mockPlanRepository.incrementSaveCount).toHaveBeenCalledWith(
        planId,
        -1,
      );
      expect(mockPlanRepository.decrementSaveCount).not.toHaveBeenCalled();
    });
  });
});
