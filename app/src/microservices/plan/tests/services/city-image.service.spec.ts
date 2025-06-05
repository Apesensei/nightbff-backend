import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";
import { Redis } from "ioredis";
import { CityImageService } from "../../services/city-image.service";
import { CityRepository } from "../../repositories/city.repository";
import { GoogleMapsService } from "@/microservices/venue/services/google-maps.service";
import { City } from "../../entities/city.entity";
import { UpdateResult } from "typeorm";
import { CACHE_MANAGER } from "@nestjs/cache-manager";

// --- REMOVE MOCK REDIS INSTANCE ---
// // Create a single mock instance to be used across tests
// const mockRedisInstance: Redis = new MockRedis();
// --- End Mock Redis ---

// --- ADD STANDARD JEST MOCK FOR REDIS ---
const mockRedisClient = {
  set: jest.fn(),
  del: jest.fn(),
  flushall: jest.fn(), // Add methods used in test setup/teardown if any
  quit: jest.fn(),
};
// --- END STANDARD JEST MOCK ---

const mockCityRepository = {
  findOneById: jest.fn(),
  updateImageUrl: jest.fn(),
};

const mockGoogleMapsService = {
  geocodeAddress: jest.fn(),
  getPlaceDetails: jest.fn(),
  getPhotoUrl: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === "REDIS_HOST") return "localhost";
    if (key === "REDIS_PORT") return 6379;
    return null;
  }),
};

// Mock Data
const mockCity: City = {
  id: "city-1",
  name: "Testville",
  countryCode: "TV",
} as City;
const mockCityWithImage: City = { ...mockCity, imageUrl: "existing-url" };
const eventPayload = {
  cityId: "city-1",
  name: "Testville",
  countryCode: "TV",
  eventId: "event-123",
};
const lockKey = `lock:event:city.created:${eventPayload.eventId}`;
const lockTtlMs = 60 * 1000; // Example TTL, ensure this matches service logic or config
const mockPlaceId = "place-id-123";
const mockPhotoReference = "photo-ref-abc";
const mockImageUrl = "http://example.com/image.jpg";

// Mock Geocode Results (for GoogleMapsService mocks)
const mockGeocodeResultWithPlaceId = { placeId: mockPlaceId };
const mockPlaceDetailsWithPhotos = {
  photos: [{ photo_reference: mockPhotoReference }],
};

describe("CityImageService", () => {
  let service: CityImageService;
  let redisClient: Redis;
  let loggerWarnSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerLogSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    // No need to flushall on the Jest mock unless explicitly implemented
    // await mockRedisInstance.flushall(); // REMOVE THIS

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CityImageService,
        { provide: CityRepository, useValue: mockCityRepository },
        { provide: GoogleMapsService, useValue: mockGoogleMapsService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: "REDIS_CLIENT", useValue: mockRedisClient }, // Use the Jest mock object
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CityImageService>(CityImageService);
    redisClient = module.get<Redis>("REDIS_CLIENT");
    loggerWarnSpy = jest.spyOn(service["logger"] as Logger, "warn");
    loggerErrorSpy = jest.spyOn(service["logger"] as Logger, "error");
    loggerLogSpy = jest.spyOn(service["logger"] as Logger, "log");
  });

  // Remove afterAll or adjust if needed, mock quit doesn't do anything unless implemented
  // afterAll(async () => {
  //   if (redisClient) {
  //       await redisClient.quit(); // Calling mock quit
  //   }
  // });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("handleCityCreated", () => {
    it("should acquire lock, find place, get photo, update repo, and release lock on success", async () => {
      // Arrange
      (mockRedisClient.set as jest.Mock).mockResolvedValue("OK");
      (mockRedisClient.del as jest.Mock).mockResolvedValue(1);
      mockCityRepository.findOneById.mockResolvedValue(mockCity);
      mockGoogleMapsService.geocodeAddress.mockResolvedValue(
        mockGeocodeResultWithPlaceId,
      );
      mockGoogleMapsService.getPlaceDetails.mockResolvedValue(
        mockPlaceDetailsWithPhotos,
      );
      mockGoogleMapsService.getPhotoUrl.mockReturnValue(mockImageUrl);
      mockCityRepository.updateImageUrl.mockResolvedValue({} as UpdateResult);

      // Act
      await service.handleCityCreated(eventPayload);

      // Assert
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        lockKey,
        "locked",
        "PX",
        lockTtlMs,
        "NX",
      );
      expect(mockCityRepository.findOneById).toHaveBeenCalledWith(
        eventPayload.cityId,
      );
      expect(mockGoogleMapsService.geocodeAddress).toHaveBeenCalledWith(
        "Testville, TV",
      );
      expect(mockGoogleMapsService.getPlaceDetails).toHaveBeenCalledWith(
        mockPlaceId,
      );
      expect(mockGoogleMapsService.getPhotoUrl).toHaveBeenCalledWith(
        mockPhotoReference,
        800,
      );
      expect(mockCityRepository.updateImageUrl).toHaveBeenCalledWith(
        eventPayload.cityId,
        mockImageUrl,
      );
      expect(mockRedisClient.del).toHaveBeenCalledWith(lockKey);
    });

    it("should skip processing if lock cannot be acquired (duplicate event)", async () => {
      // Arrange
      (mockRedisClient.set as jest.Mock).mockResolvedValue(null);

      // Act
      await service.handleCityCreated(eventPayload);

      // Assert
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        lockKey,
        "locked",
        "PX",
        lockTtlMs,
        "NX",
      );
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `Duplicate city.created event detected for event ID: ${eventPayload.eventId}. Skipping.`,
        ),
      );
      expect(mockCityRepository.findOneById).not.toHaveBeenCalled();
      expect(mockGoogleMapsService.geocodeAddress).not.toHaveBeenCalled();
      expect(mockCityRepository.updateImageUrl).not.toHaveBeenCalled();
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it("should skip processing if city already has an image", async () => {
      // Arrange
      (mockRedisClient.set as jest.Mock).mockResolvedValue("OK");
      (mockRedisClient.del as jest.Mock).mockResolvedValue(1);
      mockCityRepository.findOneById.mockResolvedValue(mockCityWithImage);

      // Act
      await service.handleCityCreated(eventPayload);

      // Assert
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        lockKey,
        "locked",
        "PX",
        lockTtlMs,
        "NX",
      );
      expect(mockCityRepository.findOneById).toHaveBeenCalledWith(
        eventPayload.cityId,
      );
      expect(mockGoogleMapsService.geocodeAddress).not.toHaveBeenCalled();
      expect(mockCityRepository.updateImageUrl).not.toHaveBeenCalled();
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `City ${mockCityWithImage.id} already has an image URL. Skipping fetch.`,
        ),
      );
      expect(mockRedisClient.del).toHaveBeenCalledWith(lockKey);
    });

    it("should skip processing if city is not found", async () => {
      // Arrange
      (mockRedisClient.set as jest.Mock).mockResolvedValue("OK");
      (mockRedisClient.del as jest.Mock).mockResolvedValue(1);
      mockCityRepository.findOneById.mockResolvedValue(null);

      // Act
      await service.handleCityCreated(eventPayload);

      // Assert
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        lockKey,
        "locked",
        "PX",
        lockTtlMs,
        "NX",
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `City ${eventPayload.cityId} not found, cannot fetch image.`,
        ),
      );
      expect(mockCityRepository.findOneById).toHaveBeenCalledWith(
        eventPayload.cityId,
      );
      expect(mockGoogleMapsService.geocodeAddress).not.toHaveBeenCalled();
      expect(mockCityRepository.updateImageUrl).not.toHaveBeenCalled();
      expect(mockRedisClient.del).toHaveBeenCalledWith(lockKey);
    });

    it("should skip processing if place ID cannot be found", async () => {
      // Arrange
      (mockRedisClient.set as jest.Mock).mockResolvedValue("OK");
      (mockRedisClient.del as jest.Mock).mockResolvedValue(1);
      mockCityRepository.findOneById.mockResolvedValue(mockCity);
      mockGoogleMapsService.geocodeAddress.mockResolvedValue(null);

      // Act
      await service.handleCityCreated(eventPayload);

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `Could not find Place ID for city: ${mockCity.name} (${mockCity.id}). Cannot fetch image.`,
        ),
      );
      expect(mockRedisClient.del).toHaveBeenCalledWith(lockKey);
    });

    it("should skip processing if place details have no photos", async () => {
      // Arrange
      (mockRedisClient.set as jest.Mock).mockResolvedValue("OK");
      (mockRedisClient.del as jest.Mock).mockResolvedValue(1);
      mockCityRepository.findOneById.mockResolvedValue(mockCity);
      mockGoogleMapsService.geocodeAddress.mockResolvedValue(
        mockGeocodeResultWithPlaceId,
      );
      mockGoogleMapsService.getPlaceDetails.mockResolvedValue({ photos: [] });

      // Act
      await service.handleCityCreated(eventPayload);

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `No photos found in Place Details for Place ID: ${mockPlaceId}`,
        ),
      );
      expect(mockRedisClient.del).toHaveBeenCalledWith(lockKey);
    });

    it("should handle error during DB update and release lock", async () => {
      // Arrange
      const dbError = new Error("DB Update Failed");
      (mockRedisClient.set as jest.Mock).mockResolvedValue("OK");
      (mockRedisClient.del as jest.Mock).mockResolvedValue(1);
      const loggerErrorSpy = jest.spyOn(service["logger"] as Logger, "error");
      mockCityRepository.findOneById.mockResolvedValue(mockCity);
      mockGoogleMapsService.geocodeAddress.mockResolvedValue(
        mockGeocodeResultWithPlaceId,
      );
      mockGoogleMapsService.getPlaceDetails.mockResolvedValue(
        mockPlaceDetailsWithPhotos,
      );
      mockGoogleMapsService.getPhotoUrl.mockReturnValue(mockImageUrl);
      mockCityRepository.updateImageUrl.mockRejectedValue(dbError);

      // Act
      await service.handleCityCreated(eventPayload);

      // Assert
      expect(mockCityRepository.updateImageUrl).toHaveBeenCalledWith(
        eventPayload.cityId,
        mockImageUrl,
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `Error handling city.created event for city ${eventPayload.cityId} (Event ID: ${eventPayload.eventId}): ${dbError.message}`,
        ),
        dbError.stack,
      );
      expect(mockRedisClient.del).toHaveBeenCalledWith(lockKey);
    });

    it("should handle error during Redis lock release gracefully", async () => {
      // Arrange
      const releaseError = new Error("Redis DEL failed");
      (mockRedisClient.set as jest.Mock).mockResolvedValue("OK");
      (mockRedisClient.del as jest.Mock).mockRejectedValue(releaseError);
      const loggerErrorSpy = jest.spyOn(service["logger"] as Logger, "error");
      mockCityRepository.findOneById.mockResolvedValue(mockCity);
      mockGoogleMapsService.geocodeAddress.mockResolvedValue(
        mockGeocodeResultWithPlaceId,
      );
      mockGoogleMapsService.getPlaceDetails.mockResolvedValue(
        mockPlaceDetailsWithPhotos,
      );
      mockGoogleMapsService.getPhotoUrl.mockReturnValue(mockImageUrl);
      mockCityRepository.updateImageUrl.mockResolvedValue({} as UpdateResult);

      // Act
      await service.handleCityCreated(eventPayload);

      // Assert
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        lockKey,
        "locked",
        "PX",
        lockTtlMs,
        "NX",
      );
      expect(mockCityRepository.updateImageUrl).toHaveBeenCalledWith(
        eventPayload.cityId,
        mockImageUrl,
      );
      expect(mockRedisClient.del).toHaveBeenCalledWith(lockKey);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `Failed to release lock for event ${eventPayload.eventId}: ${releaseError.message}`,
        ),
        releaseError.stack,
      );
    });

    it("should handle error during lock acquisition gracefully", async () => {
      // Arrange
      const setError = new Error("Redis SET failed");
      (mockRedisClient.set as jest.Mock).mockRejectedValue(setError);
      const loggerErrorSpy = jest.spyOn(service["logger"] as Logger, "error");

      // Act
      await service.handleCityCreated(eventPayload);

      // Assert
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        lockKey,
        "locked",
        "PX",
        lockTtlMs,
        "NX",
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `Error handling city.created event for city ${eventPayload.cityId} (Event ID: ${eventPayload.eventId}): ${setError.message}`,
        ),
        setError.stack,
      );
      expect(mockCityRepository.findOneById).not.toHaveBeenCalled();
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });
});
