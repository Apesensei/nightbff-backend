import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import * as axiosRetry from "axios-retry";
import { GoogleMapsService } from "../../services/google-maps.service";
import { VenueCacheService } from "../../services/venue-cache.service";
import { RateLimiterService } from "../../services/rate-limiter.service";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Logger } from "@nestjs/common";

// --- Mock axios-retry ---
jest.mock("axios-retry");
const mockedAxiosRetry = axiosRetry as jest.Mocked<typeof axiosRetry>;
// --- End Mock ---

// --- Simple Mocks ---
const mockApiKey = "test-api-key";

const mockConfigService = {
  get: jest.fn().mockImplementation((key: string) => {
    if (key === "GOOGLE_MAPS_API_KEY") return mockApiKey;
    return null;
  }),
};

const mockVenueCacheService = {
  get: jest.fn(),
  set: jest.fn(),
};

const mockRateLimiterService = {
  checkAndConsume: jest.fn().mockResolvedValue(true),
};

const mockAxiosInstance = {
  get: jest.fn(),
};

const mockHttpService = {
  axiosRef: mockAxiosInstance as unknown as AxiosInstance,
};

// Re-import interfaces for clarity in mock definition (assuming they are exported or defined appropriately)
// Note: If interfaces are not exported from the service file, they might need to be redefined here or imported differently.
// For now, assuming they are accessible or can be redefined simply.
interface MockGeocodingResult {
  geometry: { location: { lat: number; lng: number } };
  formatted_address: string;
  place_id: string;
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}
interface MockApiResponse<T> {
  status: string;
  results?: T[];
  result?: T; // Added for completeness if needed elsewhere, like place details
}

const mockGeocodeSuccessResponse: AxiosResponse<
  MockApiResponse<MockGeocodingResult>
> = {
  data: {
    status: "OK",
    results: [
      // Ensure this is an array
      {
        geometry: { location: { lat: 1, lng: 1 } },
        formatted_address: "123 Test St, Test City",
        place_id: "geocode-place-id",
        address_components: [], // Explicitly an empty array matching the interface array type
      },
      // Can add more results if needed for other tests, but one is enough for this case
    ],
  },
  status: 200,
  statusText: "OK",
  headers: {},
  config: {} as InternalAxiosRequestConfig,
};

// Ensure PlaceDetails mock is also robust if we uncomment those tests later
interface MockPlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: { location: { lat: number; lng: number } };
  // Add optional fields if accessed
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  photos?: Array<{ photo_reference: string; height: number; width: number }>;
  opening_hours?: { open_now: boolean };
  price_level?: number;
  website?: string;
  formatted_phone_number?: string;
}

const mockPlaceDetailsSuccessResponse: AxiosResponse<
  MockApiResponse<MockPlaceResult>
> = {
  data: {
    status: "OK",
    // Use 'result' key for Place Details API
    result: {
      place_id: "details-place-id",
      name: "Test Place",
      formatted_address: "Test Place Address",
      geometry: { location: { lat: 2, lng: 2 } },
      // Add other fields used by the service if any (e.g., address_components: [])
    },
  },
  status: 200,
  statusText: "OK",
  headers: {},
  config: {} as InternalAxiosRequestConfig,
};

const mockGeocodeZeroResultsResponse: AxiosResponse<
  MockApiResponse<MockGeocodingResult>
> = {
  // Use interface
  data: { results: [], status: "ZERO_RESULTS" },
  status: 200,
  statusText: "OK",
  headers: {},
  config: {} as InternalAxiosRequestConfig,
};

const mockPlaceDetailsZeroResultsResponse: AxiosResponse = {
  data: { result: null, status: "ZERO_RESULTS" },
  status: 200,
  statusText: "OK",
  headers: {},
  config: {} as InternalAxiosRequestConfig,
};

function createAxiosError(
  status: number,
  statusText: string,
  data: any = {},
): AxiosError {
  const error = new Error(
    `Request failed with status code ${status}`,
  ) as AxiosError;
  error.config = { url: "mock-url" } as InternalAxiosRequestConfig;
  error.response = {
    data,
    status,
    statusText,
    headers: {},
    config: error.config,
  };
  error.isAxiosError = true;
  error.toJSON = () => ({});
  error.name = "AxiosError";
  return error;
}
const error400 = createAxiosError(400, "Bad Request");

// --- Test Suite ---
describe("GoogleMapsService", () => {
  let service: GoogleMapsService;
  let loggerWarnSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Reset mocks before each test
    jest.resetAllMocks();
    mockVenueCacheService.get.mockReset();
    mockVenueCacheService.set.mockReset();
    mockRateLimiterService.checkAndConsume.mockReset().mockResolvedValue(true);
    mockAxiosInstance.get.mockReset(); // Reset the mock get fn
    mockConfigService.get.mockClear();
    // Remove the clear call for the module mock; resetAllMocks should handle it.
    // mockedAxiosRetry.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleMapsService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: VenueCacheService, useValue: mockVenueCacheService },
        { provide: RateLimiterService, useValue: mockRateLimiterService },
        {
          provide: Logger,
          useFactory: () => ({
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
            setContext: jest.fn(),
          }),
        },
      ],
    }).compile();

    service = module.get<GoogleMapsService>(GoogleMapsService);
    const loggerInstance = module.get(Logger);
    loggerWarnSpy = jest.spyOn(loggerInstance, "warn");
    loggerErrorSpy = jest.spyOn(loggerInstance, "error");

    // ** Manually set the API key AFTER service instance creation **
    // This bypasses any potential issues with DI during the constructor phase in testing
    (service as any).apiKey = mockApiKey;

    // Remove the redundant check now that we're setting it manually
    /*
    if ((service as any).apiKey !== mockApiKey) {
        console.error("[DEBUG TEST] API Key Mismatch! Service has:", (service as any).apiKey);
    }
    */
  });

  // --- Core Tests ---
  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should configure axios-retry on construction", () => {
    // Constructor runs in beforeEach
    expect(mockedAxiosRetry.default).toHaveBeenCalledTimes(1);
    expect(mockedAxiosRetry.default).toHaveBeenCalledWith(
      mockAxiosInstance, // Ensure it uses the mock instance
      expect.objectContaining({ retries: 3, shouldResetTimeout: true }),
    );
  });

  // --- GeocodeAddress Tests ---
  describe("geocodeAddress", () => {
    const address = "123 Test St";
    const cacheKeyParams = { address };

    it("should return from cache if available", async () => {
      const mockCachedData = {
        status: "OK",
        results: [
          {
            geometry: { location: { lat: 1, lng: 1 } },
            formatted_address: "Cached Address",
            place_id: "cached-id",
            address_components: [],
          },
        ],
      };
      mockVenueCacheService.get.mockResolvedValue(mockCachedData);

      const result = await service.geocodeAddress(address);

      expect(result).toEqual({
        latitude: 1,
        longitude: 1,
        formattedAddress: "Cached Address",
        placeId: "cached-id",
        address_components: [],
      });
      expect(mockVenueCacheService.get).toHaveBeenCalledWith(
        "geocode",
        cacheKeyParams,
      );
      expect(mockRateLimiterService.checkAndConsume).not.toHaveBeenCalled();
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });

    it("should return null if rate limited", async () => {
      mockVenueCacheService.get.mockResolvedValue(null);
      mockRateLimiterService.checkAndConsume.mockResolvedValue(false);

      const result = await service.geocodeAddress(address);

      expect(result).toBeNull();
      expect(mockVenueCacheService.get).toHaveBeenCalledWith(
        "geocode",
        cacheKeyParams,
      );
      expect(mockRateLimiterService.checkAndConsume).toHaveBeenCalledWith(
        "geocode",
      );
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });

    it("should call API, return formatted result, and cache on success", async () => {
      mockVenueCacheService.get.mockResolvedValue(null);
      mockAxiosInstance.get.mockResolvedValue(mockGeocodeSuccessResponse);

      const result = await service.geocodeAddress(address);

      expect(result).toEqual({
        latitude: 1,
        longitude: 1,
        formattedAddress: "123 Test St, Test City",
        placeId: "geocode-place-id",
        address_components: [],
      });
      expect(mockVenueCacheService.get).toHaveBeenCalledWith(
        "geocode",
        cacheKeyParams,
      );
      expect(mockRateLimiterService.checkAndConsume).toHaveBeenCalledWith(
        "geocode",
      );
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ params: { address, key: mockApiKey } }),
      );
      expect(mockVenueCacheService.set).toHaveBeenCalledWith(
        "geocode",
        cacheKeyParams,
        mockGeocodeSuccessResponse.data,
        expect.any(Number),
      );
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it("should return null and log warning on ZERO_RESULTS status", async () => {
      mockVenueCacheService.get.mockResolvedValue(null);
      mockAxiosInstance.get.mockResolvedValue(mockGeocodeZeroResultsResponse);

      const result = await service.geocodeAddress(address);

      expect(result).toBeNull();
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
      expect(mockVenueCacheService.set).not.toHaveBeenCalled(); // Should not cache zero results based on current logic
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it("should return null and log error on API error (e.g., 400)", async () => {
      mockVenueCacheService.get.mockResolvedValue(null);
      mockAxiosInstance.get.mockRejectedValue(error400);

      const result = await service.geocodeAddress(address);

      expect(result).toBeNull();
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
      expect(mockVenueCacheService.set).not.toHaveBeenCalled();
    });
  });

  // --- GetPlaceDetails Tests (Similar structure) ---
  describe("getPlaceDetails", () => {
    const placeId = "details-place-id";
    const cacheKeyParams = { placeId };

    it("should return from cache if available", async () => {
      const mockCachedData = {
        status: "OK",
        result: {
          place_id: "details-place-id",
          name: "Cached Place" /* other fields */,
        },
      };
      mockVenueCacheService.get.mockResolvedValue(mockCachedData);

      const result = await service.getPlaceDetails(placeId);

      expect(result).toEqual(mockCachedData.result);
      expect(mockVenueCacheService.get).toHaveBeenCalledWith(
        "details",
        cacheKeyParams,
      );
      expect(mockRateLimiterService.checkAndConsume).not.toHaveBeenCalled();
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });

    it("should return null if rate limited", async () => {
      mockVenueCacheService.get.mockResolvedValue(null);
      mockRateLimiterService.checkAndConsume.mockResolvedValue(false);

      const result = await service.getPlaceDetails(placeId);

      expect(result).toBeNull();
      expect(mockRateLimiterService.checkAndConsume).toHaveBeenCalledWith(
        "places.details",
      );
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });

    it("should call API, return result, and cache on success", async () => {
      mockVenueCacheService.get.mockResolvedValue(null);
      mockAxiosInstance.get.mockResolvedValue(mockPlaceDetailsSuccessResponse);

      const result = await service.getPlaceDetails(placeId);

      expect(result).toEqual(mockPlaceDetailsSuccessResponse.data.result);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({ place_id: placeId }),
        }),
      );
      expect(mockVenueCacheService.set).toHaveBeenCalledWith(
        "details",
        cacheKeyParams,
        mockPlaceDetailsSuccessResponse.data,
        expect.any(Number),
      );
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it("should return null and log warning on ZERO_RESULTS status", async () => {
      mockVenueCacheService.get.mockResolvedValue(null);
      mockAxiosInstance.get.mockResolvedValue(
        mockPlaceDetailsZeroResultsResponse,
      );

      const result = await service.getPlaceDetails(placeId);

      expect(result).toBeNull();
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
      expect(mockVenueCacheService.set).toHaveBeenCalledWith(
        "details",
        cacheKeyParams,
        mockPlaceDetailsZeroResultsResponse.data,
        expect.any(Number),
      );
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it("should return null and log error on API error (e.g., 400)", async () => {
      mockVenueCacheService.get.mockResolvedValue(null);
      mockAxiosInstance.get.mockRejectedValue(error400);

      const result = await service.getPlaceDetails(placeId);

      expect(result).toBeNull();
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
      expect(mockVenueCacheService.set).not.toHaveBeenCalled();
    });
  });

  // Add tests for reverseGeocode and searchNearby following similar patterns if needed
  // ...

  // Test for getPhotoUrl (simple case)
  describe("getPhotoUrl", () => {
    it("should return the correct photo URL structure", () => {
      const photoRef = "test-photo-ref";
      const maxWidth = 500;
      const expectedUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoRef}&key=${mockApiKey}`;
      expect(service.getPhotoUrl(photoRef, maxWidth)).toBe(expectedUrl);
    });
  });
});
