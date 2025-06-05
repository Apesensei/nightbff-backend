import { Test, TestingModule } from "@nestjs/testing";
import { CityImageService } from "../../services/city-image.service";
import { CityRepository } from "../../repositories/city.repository";
import { GoogleMapsService } from "../../../venue/services/google-maps.service";
import { EventEmitter2, EventEmitterModule } from "@nestjs/event-emitter";
import { ConfigService } from "@nestjs/config";
import { of } from "rxjs";
import Redis from "ioredis";
import { getRepositoryToken } from "@nestjs/typeorm";
import { City } from "../../entities/city.entity";

// --- Mock Implementations ---
const mockCityRepository = {
  findOneById: jest.fn(),
  updateImageUrl: jest.fn(),
};

const mockGoogleMapsService = {
  geocodeAddress: jest.fn(),
  getPlaceDetails: jest.fn(),
  getPhotoUrl: jest.fn(),
  findPlaceFromText: jest.fn(),
};

const mockRedisClient = {
  set: jest.fn(),
  del: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
};

describe("CityImageService Integration Tests", () => {
  let service: CityImageService;

  beforeEach(async () => {
    // Reset mocks before each test run
    jest.clearAllMocks();
    (mockRedisClient.set as jest.Mock).mockClear();
    (mockRedisClient.del as jest.Mock).mockClear();
    (mockCityRepository.findOneById as jest.Mock).mockClear();
    (mockCityRepository.updateImageUrl as jest.Mock).mockClear();
    (mockGoogleMapsService.geocodeAddress as jest.Mock).mockClear();
    (mockGoogleMapsService.getPlaceDetails as jest.Mock).mockClear();
    (mockGoogleMapsService.getPhotoUrl as jest.Mock).mockClear();
    // Remove findPlaceFromText mock clear if it was added
    // (mockGoogleMapsService.findPlaceFromText as jest.Mock).mockClear();

    const module: TestingModule = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        CityImageService,
        { provide: CityRepository, useValue: mockCityRepository },
        { provide: GoogleMapsService, useValue: mockGoogleMapsService },
        { provide: "REDIS_CLIENT", useValue: mockRedisClient },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<CityImageService>(CityImageService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("handleCityCreated (Test Suite 1)", () => {
    it("Test 1.1 (Happy Path): should fetch and update image url when lock acquired and APIs succeed", async () => {
      // Arrange
      const mockCityId = "test-city-id-123";
      const mockEventId = "test-event-id-abc";
      const mockPlaceId = "mock-place-id-xyz";
      const mockPhotoRef = "mock-photo-ref-1a2b";
      const mockImageUrl = "http://mock.google.com/image.jpg";
      const mockCity = {
        id: mockCityId,
        name: "Testville",
        countryCode: "TS",
        imageUrl: null,
      };
      const eventPayload = {
        cityId: mockCityId,
        name: mockCity.name,
        countryCode: mockCity.countryCode,
        eventId: mockEventId,
      };
      const lockKey = `lock:event:city.created:${mockEventId}`;

      // --- Mock Setup ---
      (mockRedisClient.set as jest.Mock).mockResolvedValue("OK");
      (mockRedisClient.del as jest.Mock).mockResolvedValue(1);
      (mockCityRepository.findOneById as jest.Mock).mockResolvedValue(mockCity);
      (mockGoogleMapsService.geocodeAddress as jest.Mock).mockResolvedValue({
        placeId: mockPlaceId,
      });
      (mockGoogleMapsService.getPlaceDetails as jest.Mock).mockResolvedValue({
        photos: [{ photo_reference: mockPhotoRef }],
      });
      (mockGoogleMapsService.getPhotoUrl as jest.Mock).mockReturnValue(
        mockImageUrl,
      );
      (mockCityRepository.updateImageUrl as jest.Mock).mockResolvedValue(
        undefined,
      );

      // Act
      await service.handleCityCreated(eventPayload);

      // Assert
      expect(mockRedisClient.set).toHaveBeenCalledTimes(1);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        lockKey,
        "locked",
        "PX",
        60000,
        "NX",
      );
      expect(mockCityRepository.findOneById).toHaveBeenCalledTimes(1);
      expect(mockCityRepository.findOneById).toHaveBeenCalledWith(mockCityId);
      expect(mockGoogleMapsService.geocodeAddress).toHaveBeenCalledTimes(1);
      expect(mockGoogleMapsService.geocodeAddress).toHaveBeenCalledWith(
        `${mockCity.name}, ${mockCity.countryCode}`,
      );
      expect(mockGoogleMapsService.getPlaceDetails).toHaveBeenCalledTimes(1);
      expect(mockGoogleMapsService.getPlaceDetails).toHaveBeenCalledWith(
        mockPlaceId,
      );
      expect(mockGoogleMapsService.getPhotoUrl).toHaveBeenCalledTimes(1);
      expect(mockGoogleMapsService.getPhotoUrl).toHaveBeenCalledWith(
        mockPhotoRef,
        800,
      );
      expect(mockCityRepository.updateImageUrl).toHaveBeenCalledTimes(1);
      expect(mockCityRepository.updateImageUrl).toHaveBeenCalledWith(
        mockCityId,
        mockImageUrl,
      );
      expect(mockRedisClient.del).toHaveBeenCalledTimes(1);
      expect(mockRedisClient.del).toHaveBeenCalledWith(lockKey);
    });

    it("Test 1.2 (Idempotency): should skip processing if lock cannot be acquired", async () => {
      // Arrange
      const mockEventId = "test-event-id-duplicate";
      const eventPayload = {
        cityId: "city-id-dupe",
        name: "Dupeville",
        countryCode: "DP",
        eventId: mockEventId,
      };
      const lockKey = `lock:event:city.created:${mockEventId}`;

      // --- Mock Setup ---
      // Simulate lock acquisition failure (SETNX returns null)
      (mockRedisClient.set as jest.Mock).mockResolvedValue(null);

      // Spy on the logger's warn method
      const loggerWarnSpy = jest.spyOn(service["logger"], "warn");

      // Act
      await service.handleCityCreated(eventPayload);

      // Assert
      // Verify lock acquisition was attempted
      expect(mockRedisClient.set).toHaveBeenCalledTimes(1);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        lockKey,
        "locked",
        "PX",
        60000,
        "NX",
      );

      // Verify warning was logged
      expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `Duplicate city.created event detected for event ID: ${mockEventId}. Skipping.`,
        ),
      );

      // Verify subsequent operations were NOT called
      expect(mockCityRepository.findOneById).not.toHaveBeenCalled();
      expect(mockGoogleMapsService.geocodeAddress).not.toHaveBeenCalled();
      expect(mockGoogleMapsService.getPlaceDetails).not.toHaveBeenCalled();
      expect(mockGoogleMapsService.getPhotoUrl).not.toHaveBeenCalled();
      expect(mockCityRepository.updateImageUrl).not.toHaveBeenCalled();

      // Verify lock was NOT released (as it wasn't acquired)
      expect(mockRedisClient.del).not.toHaveBeenCalled();

      // Restore spies
      loggerWarnSpy.mockRestore();
    });

    it("Test 1.3 (Google Maps - No Place ID): should skip processing if place ID is not found", async () => {
      // Arrange
      const mockEventId = "test-event-id-no-place";
      const eventPayload = {
        cityId: "city-id-no-place",
        name: "Nowhereville",
        countryCode: "NW",
        eventId: mockEventId,
      };
      const lockKey = `lock:event:city.created:${mockEventId}`;
      const mockCity = {
        id: eventPayload.cityId,
        name: eventPayload.name,
        countryCode: eventPayload.countryCode,
        imageUrl: null, // Ensure no existing image
        // ... other city properties if needed by the service
      } as any; // Use 'as any' or define a partial type

      // --- Mock Setup ---
      (mockRedisClient.set as jest.Mock).mockResolvedValue("OK");
      (mockRedisClient.del as jest.Mock).mockResolvedValue(1);
      mockCityRepository.findOneById.mockResolvedValue(mockCity);

      // Simulate Google Maps failing to find the place ID via the correct method
      mockGoogleMapsService.geocodeAddress.mockResolvedValue(null);

      const loggerWarnSpy = jest.spyOn(service["logger"], "warn");

      // Act
      await service.handleCityCreated(eventPayload);

      // Assert
      // Verify lock acquisition and city fetch
      expect(mockRedisClient.set).toHaveBeenCalledTimes(1);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        lockKey,
        "locked",
        "PX",
        60000,
        "NX",
      );
      expect(mockCityRepository.findOneById).toHaveBeenCalledTimes(1);
      expect(mockCityRepository.findOneById).toHaveBeenCalledWith(
        eventPayload.cityId,
      );

      // Verify attempt to find place ID using the CORRECT method
      expect(mockGoogleMapsService.geocodeAddress).toHaveBeenCalledTimes(1);
      expect(mockGoogleMapsService.geocodeAddress).toHaveBeenCalledWith(
        `${eventPayload.name}, ${eventPayload.countryCode}`,
      );

      // Verify subsequent steps were SKIPPED
      expect(mockGoogleMapsService.getPlaceDetails).not.toHaveBeenCalled();
      expect(mockGoogleMapsService.getPhotoUrl).not.toHaveBeenCalled();
      expect(mockCityRepository.updateImageUrl).not.toHaveBeenCalled();

      // Verify lock release happened
      expect(mockRedisClient.del).toHaveBeenCalledTimes(1);
      expect(mockRedisClient.del).toHaveBeenCalledWith(lockKey);

      // Verify warning was logged with ONE argument matching the actual log output
      expect(loggerWarnSpy).toHaveBeenCalledTimes(1); // Ensure it was called
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        // Expect a single string argument that contains the key info
        expect.stringContaining(
          `Could not find Place ID for city: ${eventPayload.name} (${eventPayload.cityId})`,
        ),
        // REMOVE expect.any(String) as the second argument
      );
      loggerWarnSpy.mockRestore();
    });

    it("Test 1.4 (Google Maps - No Photos): should skip image update if no photos are found", async () => {
      // Arrange
      const mockEventId = "test-event-id-no-photos";
      const mockPlaceId = "place-id-no-photos";
      const eventPayload = {
        cityId: "city-id-no-photos",
        name: "Photoless City",
        countryCode: "NP",
        eventId: mockEventId,
      };
      const lockKey = `lock:event:city.created:${mockEventId}`;
      const mockCity = {
        id: eventPayload.cityId,
        name: eventPayload.name,
        countryCode: eventPayload.countryCode,
        imageUrl: null,
      } as any;

      // --- Mock Setup ---
      (mockRedisClient.set as jest.Mock).mockResolvedValue("OK");
      (mockRedisClient.del as jest.Mock).mockResolvedValue(1);
      mockCityRepository.findOneById.mockResolvedValue(mockCity);
      mockGoogleMapsService.geocodeAddress.mockResolvedValue({
        placeId: mockPlaceId,
      });
      mockGoogleMapsService.getPlaceDetails.mockResolvedValue({
        name: "Details Found",
        photos: [],
      });

      // CORRECTED: Spy on 'warn' level based on source code evidence
      const loggerWarnSpy = jest.spyOn(service["logger"], "warn");

      // Act
      await service.handleCityCreated(eventPayload);

      // Assert
      // Verify initial steps
      expect(mockRedisClient.set).toHaveBeenCalledTimes(1);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        lockKey,
        "locked",
        "PX",
        60000,
        "NX",
      );
      expect(mockCityRepository.findOneById).toHaveBeenCalledTimes(1);
      expect(mockCityRepository.findOneById).toHaveBeenCalledWith(
        eventPayload.cityId,
      );
      expect(mockGoogleMapsService.geocodeAddress).toHaveBeenCalledTimes(1);
      expect(mockGoogleMapsService.geocodeAddress).toHaveBeenCalledWith(
        `${eventPayload.name}, ${eventPayload.countryCode}`,
      );
      expect(mockGoogleMapsService.getPlaceDetails).toHaveBeenCalledTimes(1);
      expect(mockGoogleMapsService.getPlaceDetails).toHaveBeenCalledWith(
        mockPlaceId,
      );

      // Verify photo fetch and DB update were SKIPPED
      expect(mockGoogleMapsService.getPhotoUrl).not.toHaveBeenCalled();
      expect(mockCityRepository.updateImageUrl).not.toHaveBeenCalled();

      // Verify lock release happened
      expect(mockRedisClient.del).toHaveBeenCalledTimes(1);
      expect(mockRedisClient.del).toHaveBeenCalledWith(lockKey);

      // CORRECTED: Verify warning was logged, matching actual level and message format
      expect(loggerWarnSpy).toHaveBeenCalledTimes(1); // Ensure it was called
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        // Expect a single string argument matching the service code's log
        expect.stringContaining(
          `No photos found in Place Details for Place ID: ${mockPlaceId}`,
        ),
      );
      loggerWarnSpy.mockRestore(); // Corrected spy name
    });

    it("Test 1.5 (DB Update Fails): should log error and release lock", async () => {
      // Arrange (Similar to Happy Path, reusing some vars)
      const mockCityId = "test-city-id-db-fail";
      const mockEventId = "test-event-id-db-fail";
      const mockPlaceId = "mock-place-id-db-fail";
      const mockPhotoRef = "mock-photo-ref-db-fail";
      const mockImageUrl = "http://mock.google.com/db-fail.jpg";
      const eventPayload = {
        cityId: mockCityId,
        name: "DB Fail City",
        countryCode: "DF",
        eventId: mockEventId,
      };
      const lockKey = `lock:event:city.created:${mockEventId}`;
      const mockCity = {
        id: mockCityId,
        name: eventPayload.name,
        countryCode: eventPayload.countryCode,
        imageUrl: null,
      } as any;
      const dbError = new Error("DB Update Error");

      // --- Mock Setup ---
      (mockRedisClient.set as jest.Mock).mockResolvedValue("OK"); // Lock acquired
      (mockRedisClient.del as jest.Mock).mockResolvedValue(1); // Lock release should still work
      mockCityRepository.findOneById.mockResolvedValue(mockCity);
      mockGoogleMapsService.geocodeAddress.mockResolvedValue({
        placeId: mockPlaceId,
      });
      mockGoogleMapsService.getPlaceDetails.mockResolvedValue({
        photos: [{ photo_reference: mockPhotoRef }],
      });
      mockGoogleMapsService.getPhotoUrl.mockReturnValue(mockImageUrl);
      // Simulate DB update failure
      mockCityRepository.updateImageUrl.mockRejectedValue(dbError);

      // Spy on the error logger
      const loggerErrorSpy = jest.spyOn(service["logger"], "error");

      // Act
      // Expect the call NOT to throw an error itself, as it should be caught by the service
      await expect(
        service.handleCityCreated(eventPayload),
      ).resolves.toBeUndefined();

      // Assert
      // Verify all steps up to the failure were called
      expect(mockRedisClient.set).toHaveBeenCalledTimes(1);
      expect(mockCityRepository.findOneById).toHaveBeenCalledTimes(1);
      expect(mockGoogleMapsService.geocodeAddress).toHaveBeenCalledTimes(1);
      expect(mockGoogleMapsService.getPlaceDetails).toHaveBeenCalledTimes(1);
      expect(mockGoogleMapsService.getPhotoUrl).toHaveBeenCalledTimes(1);
      expect(mockCityRepository.updateImageUrl).toHaveBeenCalledTimes(1);
      expect(mockCityRepository.updateImageUrl).toHaveBeenCalledWith(
        mockCityId,
        mockImageUrl,
      );

      // Verify error was logged
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `Error handling city.created event for city ${mockCityId}`,
        ),
        dbError.stack, // Check if the stack trace is logged as the second argument
      );

      // Verify lock release STILL happened via finally block
      expect(mockRedisClient.del).toHaveBeenCalledTimes(1);
      expect(mockRedisClient.del).toHaveBeenCalledWith(lockKey);

      loggerErrorSpy.mockRestore();
    });

    // --- End of Suite 1 ---
  });
});
