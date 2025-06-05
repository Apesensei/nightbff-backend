import { Test, TestingModule } from "@nestjs/testing";
import { ClientProxy, RpcException } from "@nestjs/microservices";
import { GoogleMapsService } from "../../../venue/services/google-maps.service"; // Adjust path if needed
import { VenueCityBackfillJob } from "../../jobs/venue-city-backfill.job";
import { of, throwError } from "rxjs";
import {
  VENUE_GET_WITHOUT_CITY_ID_PATTERN,
  VENUE_UPDATE_CITY_ID_PATTERN,
} from "../../../venue/dto/venue-backfill.dto";
import { FIND_OR_CREATE_CITY_RPC_PATTERN } from "../../dto/city-communication.dto";

// --- Mock Implementations ---
const mockVenueClient = {
  send: jest.fn(),
};

const mockPlanClient = {
  send: jest.fn(),
};

const mockGoogleMapsService = {
  reverseGeocode: jest.fn(),
  // Add other methods if needed by the job, although reverseGeocode is primary
};

describe("VenueCityBackfillJob Integration Tests", () => {
  let job: VenueCityBackfillJob;
  let venueClient: ClientProxy;
  let planClient: ClientProxy;
  let googleMapsService: GoogleMapsService;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    (mockVenueClient.send as jest.Mock).mockClear();
    (mockPlanClient.send as jest.Mock).mockClear();
    (mockGoogleMapsService.reverseGeocode as jest.Mock).mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VenueCityBackfillJob,
        { provide: "VENUE_SERVICE_RPC", useValue: mockVenueClient },
        { provide: "PLAN_SERVICE_RPC", useValue: mockPlanClient },
        { provide: GoogleMapsService, useValue: mockGoogleMapsService },
      ],
    }).compile();

    job = module.get<VenueCityBackfillJob>(VenueCityBackfillJob);
    venueClient = module.get<ClientProxy>("VENUE_SERVICE_RPC");
    planClient = module.get<ClientProxy>("PLAN_SERVICE_RPC");
    googleMapsService = module.get<GoogleMapsService>(GoogleMapsService);
  });

  it("should be defined", () => {
    expect(job).toBeDefined();
  });

  describe("runBackfill (Suite 2)", () => {
    it("Test 2.1 (Venue Job - Success Call): should process venue, call RPCs, and update venue", async () => {
      // Arrange
      const mockVenueId = "venue-id-123";
      const mockCityId = "city-id-abc";
      const mockVenue = {
        id: mockVenueId,
        name: "Test Venue",
        // Simulate GeoJSON point structure
        location: { type: "Point", coordinates: [-73.987, 40.748] },
      };
      const mockGeocodeResult = {
        address_components: [
          {
            long_name: "New York",
            short_name: "New York",
            types: ["locality"],
          },
          {
            long_name: "NY",
            short_name: "NY",
            types: ["administrative_area_level_1"],
          },
          { long_name: "United States", short_name: "US", types: ["country"] },
        ],
        // other properties if needed
      };
      const mockCity = { id: mockCityId, name: "New York" };

      // --- Mock Setup ---
      // 1. Fetch Venues RPC Call (Return one venue first time, empty second time to stop loop)
      (mockVenueClient.send as jest.Mock)
        .mockImplementationOnce((pattern, payload) => {
          if (pattern === VENUE_GET_WITHOUT_CITY_ID_PATTERN) {
            return of({ venues: [mockVenue] });
          }
          return of(null); // Default for other patterns
        })
        .mockImplementationOnce((pattern, payload) => {
          if (pattern === VENUE_GET_WITHOUT_CITY_ID_PATTERN) {
            return of({ venues: [] }); // Empty array to stop loop
          }
          return of(null);
        });

      // 2. Reverse Geocode
      (mockGoogleMapsService.reverseGeocode as jest.Mock).mockResolvedValue(
        mockGeocodeResult,
      );

      // 3. Find/Create City RPC Call
      (mockPlanClient.send as jest.Mock).mockImplementation(
        (pattern, payload) => {
          if (pattern === FIND_OR_CREATE_CITY_RPC_PATTERN) {
            return of(mockCity);
          }
          return of(null);
        },
      );

      // 4. Update Venue RPC Call
      (mockVenueClient.send as jest.Mock).mockImplementation(
        (pattern, payload) => {
          if (pattern === VENUE_UPDATE_CITY_ID_PATTERN) {
            // Only return success if it's the update pattern
            return of({ success: true });
          }
          // Return venues/empty based on call count for the GET pattern
          // Need to refine this if both GET and UPDATE are mocked on the same client mock
          // Let's reset and redefine for clarity:
          if (pattern === VENUE_GET_WITHOUT_CITY_ID_PATTERN) {
            // This won't be reached if the first implementation handles the calls
            // This logic needs adjustment - see below
          }
          return of(null);
        },
      );

      // --- Refined Mock Setup for venueClient ---
      // Reset venueClient mock specifically for this test's more complex needs
      (mockVenueClient.send as jest.Mock).mockReset();

      // First call: Get Venues (returns one)
      (mockVenueClient.send as jest.Mock).mockImplementationOnce(
        (pattern, payload) => {
          expect(pattern).toBe(VENUE_GET_WITHOUT_CITY_ID_PATTERN);
          return of({ venues: [mockVenue] });
        },
      );

      // Second call: Update Venue (returns success) - This assumes only one venue is processed
      (mockVenueClient.send as jest.Mock).mockImplementationOnce(
        (pattern, payload) => {
          expect(pattern).toBe(VENUE_UPDATE_CITY_ID_PATTERN);
          expect(payload).toEqual({ venueId: mockVenueId, cityId: mockCityId });
          return of({ success: true });
        },
      );

      // Third call: Get Venues (returns empty to stop loop)
      (mockVenueClient.send as jest.Mock).mockImplementationOnce(
        (pattern, payload) => {
          expect(pattern).toBe(VENUE_GET_WITHOUT_CITY_ID_PATTERN);
          return of({ venues: [] });
        },
      );

      // Act
      const result = await job.runBackfill();

      // Assert
      expect(result).toEqual({
        processed: 1,
        updated: 1,
        failed: 0,
        skipped: 0,
      });

      // Verify RPC call sequence and arguments
      expect(mockVenueClient.send).toHaveBeenCalledTimes(3); // Get(data), Update, Get(empty)
      expect(mockVenueClient.send).toHaveBeenNthCalledWith(
        1,
        VENUE_GET_WITHOUT_CITY_ID_PATTERN,
        { limit: 100, offset: 0 },
      );
      expect(mockVenueClient.send).toHaveBeenNthCalledWith(
        2,
        VENUE_UPDATE_CITY_ID_PATTERN,
        { venueId: mockVenueId, cityId: mockCityId },
      );
      expect(mockVenueClient.send).toHaveBeenNthCalledWith(
        3,
        VENUE_GET_WITHOUT_CITY_ID_PATTERN,
        { limit: 100, offset: 1 },
      ); // Offset increments

      expect(mockGoogleMapsService.reverseGeocode).toHaveBeenCalledTimes(1);
      expect(mockGoogleMapsService.reverseGeocode).toHaveBeenCalledWith(
        mockVenue.location.coordinates[1],
        mockVenue.location.coordinates[0],
      ); // lat, lon

      expect(mockPlanClient.send).toHaveBeenCalledTimes(1);
      expect(mockPlanClient.send).toHaveBeenCalledWith(
        FIND_OR_CREATE_CITY_RPC_PATTERN,
        expect.objectContaining({ name: "New York", countryCode: "US" }),
      );
    });

    it("Test 2.2 (Venue Job - City RPC Fails): should log error, increment failed count, and skip update", async () => {
      // Arrange
      const mockVenueId = "venue-id-city-fail";
      const mockVenue = {
        id: mockVenueId,
        name: "City Fail Venue",
        location: { type: "Point", coordinates: [-74.0, 40.7] },
      };
      const mockGeocodeResult = {
        address_components: [
          { long_name: "Test City", types: ["locality"] },
          { short_name: "TC", types: ["country"] },
        ],
      };
      const cityRpcError = new RpcException("Simulated City RPC Error");

      // --- Mock Setup ---
      // 1. Venue Client: Get Venues (first success, then empty)
      (mockVenueClient.send as jest.Mock).mockReset();
      (mockVenueClient.send as jest.Mock)
        .mockImplementationOnce((pattern) => {
          // First GET call
          expect(pattern).toBe(VENUE_GET_WITHOUT_CITY_ID_PATTERN);
          return of({ venues: [mockVenue] });
        })
        .mockImplementationOnce((pattern) => {
          // Second GET call
          expect(pattern).toBe(VENUE_GET_WITHOUT_CITY_ID_PATTERN);
          return of({ venues: [] });
        });
      // NOTE: We don't set up a handler for VENUE_UPDATE_CITY_ID_PATTERN on venueClient
      // because we expect it NOT to be called.

      // 2. Google Maps: Reverse Geocode success
      (mockGoogleMapsService.reverseGeocode as jest.Mock).mockResolvedValue(
        mockGeocodeResult,
      );

      // 3. Plan Client: Find/Create City RPC fails
      (mockPlanClient.send as jest.Mock).mockImplementation((pattern) => {
        if (pattern === FIND_OR_CREATE_CITY_RPC_PATTERN) {
          return throwError(() => cityRpcError); // Simulate RPC error
        }
        return of(null);
      });

      // Spy on logger
      const loggerErrorSpy = jest.spyOn(job["logger"], "error");

      // Act
      const result = await job.runBackfill();

      // Assert
      expect(result).toEqual({
        processed: 1,
        updated: 0,
        failed: 1,
        skipped: 0,
      });

      // Verify sequence leading up to the failure
      expect(mockVenueClient.send).toHaveBeenCalledTimes(2); // Get(data), Get(empty)
      expect(mockVenueClient.send).toHaveBeenNthCalledWith(
        1,
        VENUE_GET_WITHOUT_CITY_ID_PATTERN,
        { limit: 100, offset: 0 },
      );
      expect(mockVenueClient.send).toHaveBeenNthCalledWith(
        2,
        VENUE_GET_WITHOUT_CITY_ID_PATTERN,
        { limit: 100, offset: 1 },
      );

      expect(mockGoogleMapsService.reverseGeocode).toHaveBeenCalledTimes(1);
      expect(mockGoogleMapsService.reverseGeocode).toHaveBeenCalledWith(
        mockVenue.location.coordinates[1],
        mockVenue.location.coordinates[0],
      );

      expect(mockPlanClient.send).toHaveBeenCalledTimes(1);
      expect(mockPlanClient.send).toHaveBeenCalledWith(
        FIND_OR_CREATE_CITY_RPC_PATTERN,
        expect.objectContaining({ name: "Test City", countryCode: "TC" }),
      );

      // Verify the venue update step was SKIPPED
      // Check that mockVenueClient.send was NOT called with the UPDATE pattern
      const venueUpdateCalls = (
        mockVenueClient.send as jest.Mock
      ).mock.calls.filter((call) => call[0] === VENUE_UPDATE_CITY_ID_PATTERN);
      expect(venueUpdateCalls.length).toBe(0);

      // Verify error logging
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `RPC Error calling city.findOrCreate for venue ${mockVenueId}: ${cityRpcError.message}`,
        ),
        cityRpcError.stack,
      );

      loggerErrorSpy.mockRestore();
    });

    it("Test 2.3 (Venue Job - Venue Update RPC Fails): should log error and increment failed count", async () => {
      // Arrange
      const mockVenueId = "venue-id-update-fail";
      const mockCityId = "city-id-for-update-fail";
      const mockVenue = {
        id: mockVenueId,
        name: "Update Fail Venue",
        location: { type: "Point", coordinates: [-74.1, 40.8] },
      };
      const mockGeocodeResult = {
        address_components: [
          { long_name: "UpdateFailCity", types: ["locality"] },
          { short_name: "UF", types: ["country"] },
        ],
      };
      const mockCity = { id: mockCityId, name: "UpdateFailCity" };
      const venueUpdateError = new RpcException(
        "Simulated Venue Update RPC Error",
      );

      // --- Mock Setup ---
      // 1. Venue Client: Needs careful setup for sequence
      (mockVenueClient.send as jest.Mock).mockReset();
      //  Call 1: GET success (returns one venue)
      (mockVenueClient.send as jest.Mock).mockImplementationOnce((pattern) => {
        expect(pattern).toBe(VENUE_GET_WITHOUT_CITY_ID_PATTERN);
        return of({ venues: [mockVenue] });
      });
      //  Call 2: UPDATE fails
      (mockVenueClient.send as jest.Mock).mockImplementationOnce((pattern) => {
        expect(pattern).toBe(VENUE_UPDATE_CITY_ID_PATTERN);
        return throwError(() => venueUpdateError);
      });
      //  Call 3: GET success (returns empty to stop loop)
      (mockVenueClient.send as jest.Mock).mockImplementationOnce((pattern) => {
        expect(pattern).toBe(VENUE_GET_WITHOUT_CITY_ID_PATTERN);
        return of({ venues: [] });
      });

      // 2. Google Maps: Reverse Geocode success
      (mockGoogleMapsService.reverseGeocode as jest.Mock).mockResolvedValue(
        mockGeocodeResult,
      );

      // 3. Plan Client: Find/Create City RPC success
      (mockPlanClient.send as jest.Mock).mockImplementation((pattern) => {
        if (pattern === FIND_OR_CREATE_CITY_RPC_PATTERN) {
          return of(mockCity);
        }
        return of(null);
      });

      // Spy on logger
      const loggerErrorSpy = jest.spyOn(job["logger"], "error");

      // Act
      const result = await job.runBackfill();

      // Assert
      expect(result).toEqual({
        processed: 1,
        updated: 0,
        failed: 1,
        skipped: 0,
      });

      // Verify full sequence happened, including the failed update call
      expect(mockVenueClient.send).toHaveBeenCalledTimes(3); // Get(data), Update(fail), Get(empty)
      expect(mockVenueClient.send).toHaveBeenNthCalledWith(
        1,
        VENUE_GET_WITHOUT_CITY_ID_PATTERN,
        { limit: 100, offset: 0 },
      );
      expect(mockVenueClient.send).toHaveBeenNthCalledWith(
        2,
        VENUE_UPDATE_CITY_ID_PATTERN,
        { venueId: mockVenueId, cityId: mockCityId },
      );
      expect(mockVenueClient.send).toHaveBeenNthCalledWith(
        3,
        VENUE_GET_WITHOUT_CITY_ID_PATTERN,
        { limit: 100, offset: 1 },
      );

      expect(mockGoogleMapsService.reverseGeocode).toHaveBeenCalledTimes(1);
      expect(mockGoogleMapsService.reverseGeocode).toHaveBeenCalledWith(
        mockVenue.location.coordinates[1],
        mockVenue.location.coordinates[0],
      );

      expect(mockPlanClient.send).toHaveBeenCalledTimes(1);
      expect(mockPlanClient.send).toHaveBeenCalledWith(
        FIND_OR_CREATE_CITY_RPC_PATTERN,
        expect.objectContaining({ name: "UpdateFailCity", countryCode: "UF" }),
      );

      // Verify error logging specific to the venue update failure
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `RPC Error calling venue.updateCityId for venue ${mockVenueId}: ${venueUpdateError.message}`,
        ),
        venueUpdateError.stack,
      );

      loggerErrorSpy.mockRestore();
    });

    it("Test 2.4 (Venue Job - Geocode Fails): should log warning, increment failed count, and skip downstream RPCs", async () => {
      // Arrange
      const mockVenueId = "venue-id-geocode-fail";
      const mockVenue = {
        id: mockVenueId,
        name: "Geocode Fail Venue",
        location: { type: "Point", coordinates: [-74.2, 40.9] }, // Valid location
      };

      // --- Mock Setup ---
      // 1. Venue Client: Get Venues (first success, then empty)
      (mockVenueClient.send as jest.Mock).mockReset();
      (mockVenueClient.send as jest.Mock)
        .mockImplementationOnce((pattern) => {
          // First GET call
          expect(pattern).toBe(VENUE_GET_WITHOUT_CITY_ID_PATTERN);
          return of({ venues: [mockVenue] });
        })
        .mockImplementationOnce((pattern) => {
          // Second GET call
          expect(pattern).toBe(VENUE_GET_WITHOUT_CITY_ID_PATTERN);
          return of({ venues: [] });
        });

      // 2. Google Maps: Reverse Geocode fails (returns null)
      (mockGoogleMapsService.reverseGeocode as jest.Mock).mockResolvedValue(
        null,
      );

      // 3. Plan Client: Shouldn't be called, so no specific mock needed beyond default
      (mockPlanClient.send as jest.Mock).mockImplementation(() => of(null)); // Default

      // Spy on logger
      const loggerWarnSpy = jest.spyOn(job["logger"], "warn");

      // Act
      const result = await job.runBackfill();

      // Assert
      expect(result).toEqual({
        processed: 1,
        updated: 0,
        failed: 1,
        skipped: 0,
      });

      // Verify sequence up to the failure point
      expect(mockVenueClient.send).toHaveBeenCalledTimes(2); // Get(data), Get(empty)
      expect(mockVenueClient.send).toHaveBeenNthCalledWith(
        1,
        VENUE_GET_WITHOUT_CITY_ID_PATTERN,
        { limit: 100, offset: 0 },
      );
      expect(mockVenueClient.send).toHaveBeenNthCalledWith(
        2,
        VENUE_GET_WITHOUT_CITY_ID_PATTERN,
        { limit: 100, offset: 1 },
      );

      expect(mockGoogleMapsService.reverseGeocode).toHaveBeenCalledTimes(1);
      expect(mockGoogleMapsService.reverseGeocode).toHaveBeenCalledWith(
        mockVenue.location.coordinates[1],
        mockVenue.location.coordinates[0],
      );

      // Verify downstream RPCs were SKIPPED
      expect(mockPlanClient.send).not.toHaveBeenCalled();
      // Check that mockVenueClient.send was NOT called with the UPDATE pattern
      const venueUpdateCalls = (
        mockVenueClient.send as jest.Mock
      ).mock.calls.filter((call) => call[0] === VENUE_UPDATE_CITY_ID_PATTERN);
      expect(venueUpdateCalls.length).toBe(0);

      // Verify warning logging for geocode failure
      expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `Reverse geocode failed for venue ${mockVenueId}`,
        ),
      );

      loggerWarnSpy.mockRestore();
    });
  });
});
