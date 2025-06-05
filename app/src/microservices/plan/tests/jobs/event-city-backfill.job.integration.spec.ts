import { Test, TestingModule } from "@nestjs/testing";
import { ClientProxy, RpcException } from "@nestjs/microservices";
import { GoogleMapsService } from "../../../venue/services/google-maps.service"; // Adjust path
import { EventCityBackfillJob } from "../../jobs/event-city-backfill.job";
import { of, throwError } from "rxjs";
import {
  EVENT_GET_WITHOUT_CITY_ID_PATTERN,
  EVENT_UPDATE_CITY_ID_PATTERN,
} from "../../../event/dto/event-backfill.dto";
import { FIND_OR_CREATE_CITY_RPC_PATTERN } from "../../dto/city-communication.dto";

// --- Mock Implementations ---
const mockEventClient = {
  send: jest.fn(),
};

const mockPlanClient = {
  send: jest.fn(),
};

const mockGoogleMapsService = {
  reverseGeocode: jest.fn(),
};

describe("EventCityBackfillJob Integration Tests", () => {
  let job: EventCityBackfillJob;
  let eventClient: ClientProxy;
  let planClient: ClientProxy;
  let googleMapsService: GoogleMapsService;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    (mockEventClient.send as jest.Mock).mockClear();
    (mockPlanClient.send as jest.Mock).mockClear();
    (mockGoogleMapsService.reverseGeocode as jest.Mock).mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventCityBackfillJob,
        { provide: "EVENT_SERVICE_RPC", useValue: mockEventClient },
        { provide: "PLAN_SERVICE_RPC", useValue: mockPlanClient },
        { provide: GoogleMapsService, useValue: mockGoogleMapsService },
      ],
    }).compile();

    job = module.get<EventCityBackfillJob>(EventCityBackfillJob);
    eventClient = module.get<ClientProxy>("EVENT_SERVICE_RPC");
    planClient = module.get<ClientProxy>("PLAN_SERVICE_RPC");
    googleMapsService = module.get<GoogleMapsService>(GoogleMapsService);
  });

  it("should be defined", () => {
    expect(job).toBeDefined();
  });

  describe("runBackfill (Suite 2 - Event Job)", () => {
    it("Test 2.5 (Event Job - Success Call): should process event, call RPCs, and update event", async () => {
      // Arrange
      const mockEventId = "event-id-123";
      const mockCityId = "city-id-xyz";
      const mockVenue = {
        id: "venue-for-event",
        location: { type: "Point", coordinates: [-73.999, 40.799] },
      };
      const mockEvent = {
        id: mockEventId,
        name: "Test Event",
        venue: mockVenue, // Include venue relation
      };
      const mockGeocodeResult = {
        address_components: [
          { long_name: "EventCity", types: ["locality"] },
          { short_name: "EC", types: ["country"] },
        ],
      };
      const mockCity = { id: mockCityId, name: "EventCity" };

      // --- Mock Setup ---
      // 1. Event Client: Needs sequence: GET -> UPDATE -> GET
      (mockEventClient.send as jest.Mock).mockReset();
      // Call 1: GET success (returns one event)
      (mockEventClient.send as jest.Mock).mockImplementationOnce((pattern) => {
        expect(pattern).toBe(EVENT_GET_WITHOUT_CITY_ID_PATTERN);
        return of({ events: [mockEvent] });
      });
      // Call 2: UPDATE success
      (mockEventClient.send as jest.Mock).mockImplementationOnce(
        (pattern, payload) => {
          expect(pattern).toBe(EVENT_UPDATE_CITY_ID_PATTERN);
          expect(payload).toEqual({ eventId: mockEventId, cityId: mockCityId });
          return of({ success: true });
        },
      );
      // Call 3: GET success (returns empty)
      (mockEventClient.send as jest.Mock).mockImplementationOnce((pattern) => {
        expect(pattern).toBe(EVENT_GET_WITHOUT_CITY_ID_PATTERN);
        return of({ events: [] });
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
      expect(mockEventClient.send).toHaveBeenCalledTimes(3); // Get(data), Update, Get(empty)
      expect(mockEventClient.send).toHaveBeenNthCalledWith(
        1,
        EVENT_GET_WITHOUT_CITY_ID_PATTERN,
        { limit: 100, offset: 0 },
      );
      expect(mockEventClient.send).toHaveBeenNthCalledWith(
        2,
        EVENT_UPDATE_CITY_ID_PATTERN,
        { eventId: mockEventId, cityId: mockCityId },
      );
      expect(mockEventClient.send).toHaveBeenNthCalledWith(
        3,
        EVENT_GET_WITHOUT_CITY_ID_PATTERN,
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
        expect.objectContaining({ name: "EventCity", countryCode: "EC" }),
      );
    });

    it("Test 2.6 (Event Job - City RPC Fails): should log error, increment skipped count, and skip update", async () => {
      // Arrange
      const mockEventId = "event-id-city-fail";
      const mockVenue = {
        id: "venue-for-event-city-fail",
        location: { type: "Point", coordinates: [-74.001, 40.701] },
      };
      const mockEvent = {
        id: mockEventId,
        name: "City Fail Event",
        venue: mockVenue,
      };
      const mockGeocodeResult = {
        address_components: [
          { long_name: "CityFailTown", types: ["locality"] },
          { short_name: "CF", types: ["country"] },
        ],
      };
      const cityRpcError = new RpcException("Simulated City RPC Error");

      // --- Mock Setup ---
      // 1. Event Client: Get Events (first success, then empty)
      (mockEventClient.send as jest.Mock).mockReset();
      (mockEventClient.send as jest.Mock)
        .mockImplementationOnce((pattern) => {
          // First GET call
          expect(pattern).toBe(EVENT_GET_WITHOUT_CITY_ID_PATTERN);
          return of({ events: [mockEvent] });
        })
        .mockImplementationOnce((pattern) => {
          // Second GET call
          expect(pattern).toBe(EVENT_GET_WITHOUT_CITY_ID_PATTERN);
          return of({ events: [] });
        });
      // NOTE: No handler needed for EVENT_UPDATE_CITY_ID_PATTERN

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
      // Source code increments 'skipped' on city RPC failure
      expect(result).toEqual({
        processed: 1,
        updated: 0,
        failed: 0,
        skipped: 1,
      });

      // Verify sequence leading up to the failure
      expect(mockEventClient.send).toHaveBeenCalledTimes(2); // Get(data), Get(empty)
      expect(mockEventClient.send).toHaveBeenNthCalledWith(
        1,
        EVENT_GET_WITHOUT_CITY_ID_PATTERN,
        { limit: 100, offset: 0 },
      );
      expect(mockEventClient.send).toHaveBeenNthCalledWith(
        2,
        EVENT_GET_WITHOUT_CITY_ID_PATTERN,
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
        expect.objectContaining({ name: "CityFailTown", countryCode: "CF" }),
      );

      // Verify the event update step was SKIPPED
      const eventUpdateCalls = (
        mockEventClient.send as jest.Mock
      ).mock.calls.filter((call) => call[0] === EVENT_UPDATE_CITY_ID_PATTERN);
      expect(eventUpdateCalls.length).toBe(0);

      // Verify error logging
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `RPC Error calling city.findOrCreate for event ${mockEventId}: ${cityRpcError.message}`,
        ),
        cityRpcError.stack,
      );

      loggerErrorSpy.mockRestore();
    });

    it("Test 2.7 (Event Job - Event Update RPC Fails): should log error and increment failed count", async () => {
      // Arrange
      const mockEventId = "event-id-update-fail";
      const mockCityId = "city-id-for-update-fail";
      const mockVenue = {
        id: "venue-for-event-update-fail",
        location: { type: "Point", coordinates: [-74.101, 40.801] },
      };
      const mockEvent = {
        id: mockEventId,
        name: "Update Fail Event",
        venue: mockVenue,
      };
      const mockGeocodeResult = {
        address_components: [
          { long_name: "UpdateFailCity", types: ["locality"] },
          { short_name: "UF", types: ["country"] },
        ],
      };
      const mockCity = { id: mockCityId, name: "UpdateFailCity" };
      const eventUpdateError = new RpcException(
        "Simulated Event Update RPC Error",
      );

      // --- Mock Setup ---
      // 1. Event Client: Sequence GET -> UPDATE (fail) -> GET
      (mockEventClient.send as jest.Mock).mockReset();
      // Call 1: GET success (returns one event)
      (mockEventClient.send as jest.Mock).mockImplementationOnce((pattern) => {
        expect(pattern).toBe(EVENT_GET_WITHOUT_CITY_ID_PATTERN);
        return of({ events: [mockEvent] });
      });
      // Call 2: UPDATE fails
      (mockEventClient.send as jest.Mock).mockImplementationOnce((pattern) => {
        expect(pattern).toBe(EVENT_UPDATE_CITY_ID_PATTERN);
        return throwError(() => eventUpdateError);
      });
      // Call 3: GET success (returns empty)
      (mockEventClient.send as jest.Mock).mockImplementationOnce((pattern) => {
        expect(pattern).toBe(EVENT_GET_WITHOUT_CITY_ID_PATTERN);
        return of({ events: [] });
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
      // Source code increments 'failed' on event update RPC failure
      expect(result).toEqual({
        processed: 1,
        updated: 0,
        failed: 1,
        skipped: 0,
      });

      // Verify full sequence including the failed update
      expect(mockEventClient.send).toHaveBeenCalledTimes(3); // Get(data), Update(fail), Get(empty)
      expect(mockEventClient.send).toHaveBeenNthCalledWith(
        1,
        EVENT_GET_WITHOUT_CITY_ID_PATTERN,
        { limit: 100, offset: 0 },
      );
      expect(mockEventClient.send).toHaveBeenNthCalledWith(
        2,
        EVENT_UPDATE_CITY_ID_PATTERN,
        { eventId: mockEventId, cityId: mockCityId },
      );
      expect(mockEventClient.send).toHaveBeenNthCalledWith(
        3,
        EVENT_GET_WITHOUT_CITY_ID_PATTERN,
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

      // Verify error logging specific to the event update failure
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `RPC Error calling event.updateCityId for event ${mockEventId}: ${eventUpdateError.message}`,
        ),
        eventUpdateError.stack,
      );

      loggerErrorSpy.mockRestore();
    });

    it("Test 2.8 (Event Job - Geocode Fails): should log warning, increment skipped count, and skip downstream RPCs", async () => {
      // Arrange
      const mockEventId = "event-id-geocode-fail";
      const mockVenue = {
        id: "venue-for-event-geocode-fail",
        location: { type: "Point", coordinates: [-74.201, 40.901] }, // Valid location
      };
      const mockEvent = {
        id: mockEventId,
        name: "Geocode Fail Event",
        venue: mockVenue,
      };

      // --- Mock Setup ---
      // 1. Event Client: Get Events (first success, then empty)
      (mockEventClient.send as jest.Mock).mockReset();
      (mockEventClient.send as jest.Mock)
        .mockImplementationOnce((pattern) => {
          // First GET call
          expect(pattern).toBe(EVENT_GET_WITHOUT_CITY_ID_PATTERN);
          return of({ events: [mockEvent] });
        })
        .mockImplementationOnce((pattern) => {
          // Second GET call
          expect(pattern).toBe(EVENT_GET_WITHOUT_CITY_ID_PATTERN);
          return of({ events: [] });
        });

      // 2. Google Maps: Reverse Geocode fails (returns null)
      (mockGoogleMapsService.reverseGeocode as jest.Mock).mockResolvedValue(
        null,
      );

      // 3. Plan Client: Shouldn't be called, so no specific mock needed
      (mockPlanClient.send as jest.Mock).mockImplementation(() => of(null));

      // Spy on logger
      const loggerWarnSpy = jest.spyOn(job["logger"], "warn");

      // Act
      const result = await job.runBackfill();

      // Assert
      // Source code increments 'skipped' on geocode failure
      expect(result).toEqual({
        processed: 1,
        updated: 0,
        failed: 0,
        skipped: 1,
      });

      // Verify sequence up to the failure point
      expect(mockEventClient.send).toHaveBeenCalledTimes(2); // Get(data), Get(empty)
      expect(mockEventClient.send).toHaveBeenNthCalledWith(
        1,
        EVENT_GET_WITHOUT_CITY_ID_PATTERN,
        { limit: 100, offset: 0 },
      );
      expect(mockEventClient.send).toHaveBeenNthCalledWith(
        2,
        EVENT_GET_WITHOUT_CITY_ID_PATTERN,
        { limit: 100, offset: 1 },
      );

      expect(mockGoogleMapsService.reverseGeocode).toHaveBeenCalledTimes(1);
      expect(mockGoogleMapsService.reverseGeocode).toHaveBeenCalledWith(
        mockVenue.location.coordinates[1],
        mockVenue.location.coordinates[0],
      );

      // Verify downstream RPCs were SKIPPED
      expect(mockPlanClient.send).not.toHaveBeenCalled();
      const eventUpdateCalls = (
        mockEventClient.send as jest.Mock
      ).mock.calls.filter((call) => call[0] === EVENT_UPDATE_CITY_ID_PATTERN);
      expect(eventUpdateCalls.length).toBe(0);

      // Verify warning logging for geocode failure
      expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `Reverse geocode failed for event ${mockEventId} (venue ${mockVenue.id}`,
        ), // Match start of log message
      );

      loggerWarnSpy.mockRestore();
    });
  });
});
