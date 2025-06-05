import { Test, TestingModule } from "@nestjs/testing";
import { ClientProxy, RpcException } from "@nestjs/microservices";
import { Logger } from "@nestjs/common";
import { of, throwError } from "rxjs";
import { VenueCityBackfillJob } from "../../jobs/venue-city-backfill.job";
import { GoogleMapsService } from "@/microservices/venue/services/google-maps.service";
import {
  VENUE_GET_WITHOUT_CITY_ID_PATTERN,
  VENUE_UPDATE_CITY_ID_PATTERN,
} from "@/microservices/venue/dto/venue-backfill.dto";
import { FIND_OR_CREATE_CITY_RPC_PATTERN } from "@/microservices/plan/dto/city-communication.dto";
import { City } from "@/microservices/plan/entities/city.entity";

// Mocks
const mockVenueClient = {
  send: jest.fn(),
  close: jest.fn(),
};
const mockPlanClient = {
  send: jest.fn(),
  close: jest.fn(),
};
const mockGoogleMapsService = {
  reverseGeocode: jest.fn(),
};

// Mock Data
const mockVenue1 = {
  id: "venue-1",
  name: "Venue One",
  location: { type: "Point", coordinates: [10, 20] }, // lng, lat
};
const mockVenue2 = {
  id: "venue-2",
  name: "Venue Two",
  location: { type: "Point", coordinates: [30, 40] },
};
const mockVenueInvalidLoc = {
  id: "venue-invalid",
  name: "Venue Invalid Loc",
  location: { type: "Polygon", coordinates: [] },
};
const mockGeocodeResult1 = {
  address_components: [
    { long_name: "City One", types: ["locality"] },
    { short_name: "C1", types: ["country"] },
  ],
};
const mockCity1: City = {
  id: "city-1",
  name: "City One",
  countryCode: "C1",
} as City;

// Spy on Logger methods - defined globally for access in tests
let loggerErrorSpy: jest.SpyInstance;
let loggerWarnSpy: jest.SpyInstance;
let loggerLogSpy: jest.SpyInstance;
let loggerDebugSpy: jest.SpyInstance;

describe("VenueCityBackfillJob", () => {
  let job: VenueCityBackfillJob;

  beforeAll(() => {
    // Initialize spies before any tests run
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => {});
    loggerWarnSpy = jest
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => {});
    loggerLogSpy = jest
      .spyOn(Logger.prototype, "log")
      .mockImplementation(() => {});
    loggerDebugSpy = jest
      .spyOn(Logger.prototype, "debug")
      .mockImplementation(() => {});
    jest.useFakeTimers(); // Use fake timers for setTimeout
  });

  beforeEach(async () => {
    jest.clearAllMocks(); // Clear mocks before each test

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VenueCityBackfillJob,
        { provide: "VENUE_SERVICE_RPC", useValue: mockVenueClient },
        { provide: "PLAN_SERVICE_RPC", useValue: mockPlanClient },
        { provide: GoogleMapsService, useValue: mockGoogleMapsService },
        // Provide Logger to ensure spies can attach
        { provide: Logger, useValue: new Logger(VenueCityBackfillJob.name) },
      ],
    }).compile();

    job = module.get<VenueCityBackfillJob>(VenueCityBackfillJob);
    (job as any).isRunning = false; // Reset flag
  });

  afterAll(() => {
    // Close mock clients after all tests in this suite
    mockVenueClient.close();
    mockPlanClient.close();
    // Restore logger spies if needed
    // loggerErrorSpy.mockRestore();
    // loggerWarnSpy.mockRestore();
    // loggerLogSpy.mockRestore();
    // loggerDebugSpy.mockRestore();
    jest.useRealTimers(); // Restore real timers (moved from separate afterAll)
  });

  it("should be defined", () => {
    expect(job).toBeDefined();
  });

  it("should throw error and skip if already running", async () => {
    // Arrange
    (job as any).isRunning = true;

    // Act & Assert
    await expect(job.runBackfill()).rejects.toThrow("Job already in progress");
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("already running"),
    );
    expect(mockVenueClient.send).not.toHaveBeenCalled();
  });

  it("should process venues successfully in a single batch", async () => {
    // Arrange
    // Mock the RPC calls in sequence using rxjs `of`
    mockVenueClient.send
      .mockImplementationOnce((pattern, payload) => {
        // First fetch (offset 0)
        if (pattern === VENUE_GET_WITHOUT_CITY_ID_PATTERN) {
          return of({ venues: [mockVenue1, mockVenue2], total: 2 });
        }
        return of(null); // Should not be called with other patterns here
      })
      .mockImplementationOnce((pattern) => {
        // Mock cityId Update for Venue 1
        if (pattern === VENUE_UPDATE_CITY_ID_PATTERN)
          return of({ success: true });
        return of(null);
      })
      .mockImplementationOnce((pattern) => {
        // Mock cityId Update for Venue 2
        if (pattern === VENUE_UPDATE_CITY_ID_PATTERN)
          return of({ success: true });
        return of(null);
      })
      .mockImplementationOnce((pattern, payload) => {
        // Second fetch (offset 2) - should return empty
        if (pattern === VENUE_GET_WITHOUT_CITY_ID_PATTERN) {
          return of({ venues: [], total: 2 });
        }
        return of(null);
      });

    mockGoogleMapsService.reverseGeocode.mockResolvedValue(mockGeocodeResult1);
    mockPlanClient.send.mockReturnValue(of(mockCity1)); // Mock city RPC with `of`

    // Act
    const resultPromise = job.runBackfill();
    await jest.advanceTimersByTimeAsync(2 * 100 + 10); // Advance past setTimeout calls
    const result = await resultPromise;

    // Assert
    // Adjusted expectation: success = processed: 2, updated: 2, failed: 0, skipped: 0
    expect(result).toEqual({ processed: 2, updated: 2, failed: 0, skipped: 0 });
    // ... verify calls sequence if needed ...
    expect(loggerLogSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Venue city backfill job finished. Processed: 2, Updated: 2, Failed: 0, Skipped: 0",
      ),
    ); // Corrected log prefix
  });

  it("should handle multiple batches", async () => {
    // Arrange
    // Mock RPC calls in sequence using rxjs `of`
    mockVenueClient.send
      .mockImplementationOnce((pattern, payload) => {
        // First fetch (offset 0)
        if (pattern === VENUE_GET_WITHOUT_CITY_ID_PATTERN)
          return of({ venues: [mockVenue1], total: 2 });
        return of(null);
      })
      .mockImplementationOnce((pattern) => {
        // Update for Venue 1
        if (pattern === VENUE_UPDATE_CITY_ID_PATTERN)
          return of({ success: true });
        return of(null);
      })
      .mockImplementationOnce((pattern, payload) => {
        // Second fetch (offset 1)
        if (pattern === VENUE_GET_WITHOUT_CITY_ID_PATTERN)
          return of({ venues: [mockVenue2], total: 2 });
        return of(null);
      })
      .mockImplementationOnce((pattern) => {
        // Update for Venue 2
        if (pattern === VENUE_UPDATE_CITY_ID_PATTERN)
          return of({ success: true });
        return of(null);
      })
      .mockImplementationOnce((pattern, payload) => {
        // Third fetch (offset 2)
        if (pattern === VENUE_GET_WITHOUT_CITY_ID_PATTERN)
          return of({ venues: [], total: 2 }); // Empty to stop
        return of(null);
      });

    mockGoogleMapsService.reverseGeocode.mockResolvedValue(mockGeocodeResult1);
    mockPlanClient.send.mockReturnValue(of(mockCity1)); // Mock city RPC with `of`

    // Act
    const resultPromise = job.runBackfill();
    await jest.advanceTimersByTimeAsync(2 * 100 + 10); // Advance past delays
    const result = await resultPromise;

    // Assert
    // Adjusted expectation: success = processed: 2, updated: 2, failed: 0, skipped: 0
    expect(result).toEqual({ processed: 2, updated: 2, failed: 0, skipped: 0 });
    // ... verify calls sequence ...
    expect(loggerLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Processing batch of 1 venues"),
    ); // Called twice
    expect(loggerLogSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Venue city backfill job finished. Processed: 2, Updated: 2, Failed: 0, Skipped: 0",
      ),
    ); // Corrected log prefix
  });

  it("should handle no venues needing backfill", async () => {
    mockVenueClient.send.mockReturnValueOnce(of({ venues: [], total: 0 }));

    const result = await job.runBackfill();

    // Assert that the result reflects no processing occurred, including skipped
    expect(result).toEqual({ processed: 0, updated: 0, failed: 0, skipped: 0 });
    expect(mockVenueClient.send).toHaveBeenCalledTimes(1);
    expect(mockGoogleMapsService.reverseGeocode).not.toHaveBeenCalled();
    expect(loggerLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("No more venues found"),
    );
    expect((job as any).isRunning).toBe(false);
  });

  it("should skip venue with invalid location and count as failed", async () => {
    mockVenueClient.send
      .mockReturnValueOnce(of({ venues: [mockVenueInvalidLoc], total: 1 }))
      .mockReturnValueOnce(of({ venues: [], total: 0 }));

    const resultPromise = job.runBackfill();
    await jest.advanceTimersByTimeAsync(100 + 10);
    const result = await resultPromise;

    // Expect failed: 1, skipped: 0
    expect(result).toEqual({ processed: 1, updated: 0, failed: 1, skipped: 0 });
    // Ensure the log message matches the code exactly
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("invalid or missing location object. Skipping."),
    );
    expect(mockGoogleMapsService.reverseGeocode).not.toHaveBeenCalled();
    expect(mockPlanClient.send).not.toHaveBeenCalled();
    expect((job as any).isRunning).toBe(false);
  });

  it("should skip venue if reverse geocode fails and count as failed", async () => {
    // Arrange
    mockVenueClient.send
      .mockImplementationOnce((pattern) => {
        // Fetch venue
        if (pattern === VENUE_GET_WITHOUT_CITY_ID_PATTERN)
          return of({ venues: [mockVenue1], total: 1 });
        return of(null);
      })
      // No update call expected
      .mockImplementationOnce((pattern) => {
        // Fetch empty to stop
        if (pattern === VENUE_GET_WITHOUT_CITY_ID_PATTERN)
          return of({ venues: [], total: 1 });
        return of(null);
      });

    mockGoogleMapsService.reverseGeocode.mockResolvedValue(null);
    mockPlanClient.send.mockReturnValue(of(mockCity1)); // Mock city RPC with `of`

    // Act
    const resultPromise = job.runBackfill();
    await jest.advanceTimersByTimeAsync(100 + 10);
    const result = await resultPromise;

    // Assert
    // Expect failed: 1, skipped: 0
    expect(result).toEqual({ processed: 1, updated: 0, failed: 1, skipped: 0 });
    expect(mockPlanClient.send).not.toHaveBeenCalled();
    expect(mockVenueClient.send).not.toHaveBeenCalledWith(
      VENUE_UPDATE_CITY_ID_PATTERN,
      expect.anything(),
    );
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Reverse geocode failed for venue venue-1"),
    );
    expect(loggerLogSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Venue city backfill job finished. Processed: 1, Updated: 0, Failed: 1, Skipped: 0",
      ),
    ); // Corrected log prefix
  });

  it("should skip venue if geocode parsing fails and count as failed", async () => {
    mockVenueClient.send
      .mockReturnValueOnce(of({ venues: [mockVenue1], total: 1 }))
      .mockReturnValueOnce(of({ venues: [], total: 0 }));
    mockGoogleMapsService.reverseGeocode.mockResolvedValue({
      address_components: [],
    }); // Missing components

    const resultPromise = job.runBackfill();
    await jest.advanceTimersByTimeAsync(100 + 10);
    const result = await resultPromise;

    // Expect failed: 1, skipped: 0
    expect(result).toEqual({ processed: 1, updated: 0, failed: 1, skipped: 0 });
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        `Could not parse city/country for venue ${mockVenue1.id} from geocode result. Skipping.`,
      ),
    ); // Updated ID and full message
    expect(mockPlanClient.send).not.toHaveBeenCalled();
    expect((job as any).isRunning).toBe(false);
    expect(loggerLogSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Venue city backfill job finished. Processed: 1, Updated: 0, Failed: 1, Skipped: 0",
      ),
    ); // Corrected log prefix
  });

  it("should skip venue if city RPC fails and count as failed", async () => {
    // Arrange
    const cityRpcError = new RpcException("City service unavailable");
    mockVenueClient.send
      .mockImplementationOnce((pattern) => {
        // Fetch venue
        if (pattern === VENUE_GET_WITHOUT_CITY_ID_PATTERN)
          return of({ venues: [mockVenue1], total: 1 });
        return of(null);
      })
      // No update call expected
      .mockImplementationOnce((pattern) => {
        // Fetch empty to stop
        if (pattern === VENUE_GET_WITHOUT_CITY_ID_PATTERN)
          return of({ venues: [], total: 1 });
        return of(null);
      });

    mockGoogleMapsService.reverseGeocode.mockResolvedValue(mockGeocodeResult1);
    mockPlanClient.send.mockReturnValue(throwError(() => cityRpcError)); // Mock city RPC failure with `throwError`

    // Act
    const resultPromise = job.runBackfill();
    await jest.advanceTimersByTimeAsync(100 + 10);
    const result = await resultPromise;

    // Assert
    // Expect failed: 1, skipped: 0
    expect(result).toEqual({ processed: 1, updated: 0, failed: 1, skipped: 0 });
    expect(mockPlanClient.send).toHaveBeenCalledTimes(1); // Called once
    expect(mockVenueClient.send).not.toHaveBeenCalledWith(
      VENUE_UPDATE_CITY_ID_PATTERN,
      expect.anything(),
    );
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "RPC Error calling city.findOrCreate for venue venue-1",
      ),
      cityRpcError.stack,
    );
    expect(loggerLogSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Venue city backfill job finished. Processed: 1, Updated: 0, Failed: 1, Skipped: 0",
      ),
    ); // Corrected log prefix
  });

  it("should skip venue if city RPC returns null and count as failed", async () => {
    mockVenueClient.send
      .mockReturnValueOnce(of({ venues: [mockVenue1], total: 1 }))
      .mockReturnValueOnce(of({ venues: [], total: 0 }));
    mockGoogleMapsService.reverseGeocode.mockResolvedValue(mockGeocodeResult1);
    mockPlanClient.send.mockReturnValue(of(null)); // City RPC returns null

    const resultPromise = job.runBackfill();
    await jest.advanceTimersByTimeAsync(100 + 10);
    const result = await resultPromise;

    // Expect failed: 1, skipped: 0
    expect(result).toEqual({ processed: 1, updated: 0, failed: 1, skipped: 0 });
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "city.findOrCreate returned null for venue venue-1",
      ),
    );
    expect(mockVenueClient.send).not.toHaveBeenCalledWith(
      VENUE_UPDATE_CITY_ID_PATTERN,
      expect.anything(),
    );
    expect((job as any).isRunning).toBe(false);
    expect(loggerLogSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Venue city backfill job finished. Processed: 1, Updated: 0, Failed: 1, Skipped: 0",
      ),
    ); // Corrected log prefix
  });

  it("should count as failed if venue update RPC throws error", async () => {
    // Arrange
    const rpcError = new RpcException("Update failed");
    mockVenueClient.send
      .mockImplementationOnce((pattern) => {
        // Fetch venue
        if (pattern === VENUE_GET_WITHOUT_CITY_ID_PATTERN)
          return of({ venues: [mockVenue1], total: 1 });
        return of(null);
      })
      .mockImplementationOnce((pattern) => {
        // Mock update failure with `throwError`
        if (pattern === VENUE_UPDATE_CITY_ID_PATTERN)
          return throwError(() => rpcError);
        return of(null);
      })
      .mockImplementationOnce((pattern) => {
        // Fetch empty to stop
        if (pattern === VENUE_GET_WITHOUT_CITY_ID_PATTERN)
          return of({ venues: [], total: 1 });
        return of(null);
      });

    mockGoogleMapsService.reverseGeocode.mockResolvedValue(mockGeocodeResult1);
    mockPlanClient.send.mockReturnValue(of(mockCity1)); // Mock city RPC with `of`

    // Act
    const resultPromise = job.runBackfill();
    await jest.advanceTimersByTimeAsync(100 + 10);
    const result = await resultPromise;

    // Assert
    // Adjusted expectation: failed = processed: 1, updated: 0, failed: 1, skipped: 0
    expect(result).toEqual({ processed: 1, updated: 0, failed: 1, skipped: 0 });
    expect(mockVenueClient.send).toHaveBeenCalledWith(
      VENUE_UPDATE_CITY_ID_PATTERN,
      { venueId: mockVenue1.id, cityId: mockCity1.id },
    );
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "RPC Error calling venue.updateCityId for venue venue-1",
      ),
      rpcError.stack,
    );
    expect(loggerLogSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Venue city backfill job finished. Processed: 1, Updated: 0, Failed: 1, Skipped: 0",
      ),
    ); // Corrected log prefix
  });

  it("should count as failed if venue update RPC returns !success", async () => {
    // Arrange
    mockVenueClient.send
      .mockImplementationOnce((pattern) => {
        // Fetch venue
        if (pattern === VENUE_GET_WITHOUT_CITY_ID_PATTERN)
          return of({ venues: [mockVenue1], total: 1 });
        return of(null);
      })
      .mockImplementationOnce((pattern) => {
        // Mock update returning !success
        if (pattern === VENUE_UPDATE_CITY_ID_PATTERN)
          return of({ success: false });
        return of(null);
      })
      .mockImplementationOnce((pattern) => {
        // Fetch empty to stop
        if (pattern === VENUE_GET_WITHOUT_CITY_ID_PATTERN)
          return of({ venues: [], total: 1 });
        return of(null);
      });

    mockGoogleMapsService.reverseGeocode.mockResolvedValue(mockGeocodeResult1);
    mockPlanClient.send.mockReturnValue(of(mockCity1)); // Mock city RPC with `of`

    // Act
    const resultPromise = job.runBackfill();
    await jest.advanceTimersByTimeAsync(100 + 10);
    const result = await resultPromise;

    // Assert
    // Adjusted expectation: failed = processed: 1, updated: 0, failed: 1, skipped: 0
    expect(result).toEqual({ processed: 1, updated: 0, failed: 1, skipped: 0 });
    expect(mockVenueClient.send).toHaveBeenCalledWith(
      VENUE_UPDATE_CITY_ID_PATTERN,
      { venueId: mockVenue1.id, cityId: mockCity1.id },
    );
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Failed to update cityId for venue venue-1 (RPC returned !success)",
      ),
    );
    expect(loggerLogSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Venue city backfill job finished. Processed: 1, Updated: 0, Failed: 1, Skipped: 0",
      ),
    ); // Corrected log prefix
  });

  it("should handle critical error when fetching venue batches", async () => {
    // Arrange
    const rpcError = new RpcException("Fetch failed");
    mockVenueClient.send.mockImplementation((pattern) => {
      if (pattern === VENUE_GET_WITHOUT_CITY_ID_PATTERN) {
        return throwError(() => rpcError);
      }
      return of({});
    });

    // Act & Assert
    await expect(job.runBackfill()).rejects.toThrow(
      new RpcException(`Failed to fetch venues batch: ${rpcError.message}`),
    );

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("RPC Error fetching venues"),
      rpcError.stack,
    );
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Venue city backfill job failed critically"),
      expect.stringContaining(rpcError.message),
    );
    expect((job as any).isRunning).toBe(false);
  });

  it("should skip if venue lacks Point geometry and count as failed", async () => {
    // Arrange
    const mockVenueNoGeom = { ...mockVenue1, location: null }; // Simulate missing location
    mockVenueClient.send
      .mockImplementationOnce((pattern) => {
        // Fetch venue
        if (pattern === VENUE_GET_WITHOUT_CITY_ID_PATTERN)
          return of({ venues: [mockVenueNoGeom], total: 1 });
        return of(null);
      })
      .mockImplementationOnce((pattern) => {
        // Fetch empty to stop
        if (pattern === VENUE_GET_WITHOUT_CITY_ID_PATTERN)
          return of({ venues: [], total: 1 });
        return of(null);
      });

    // Act
    const resultPromise = job.runBackfill();
    await jest.advanceTimersByTimeAsync(100 + 10);
    const result = await resultPromise;

    // Assert
    // Expect failed: 1, skipped: 0
    expect(result).toEqual({ processed: 1, updated: 0, failed: 1, skipped: 0 });
    // Match exact log message from code
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        `Venue ${mockVenueNoGeom.id} has invalid or missing location object. Skipping.`,
      ),
    );
    expect(mockGoogleMapsService.reverseGeocode).not.toHaveBeenCalled();
    expect(loggerLogSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Venue city backfill job finished. Processed: 1, Updated: 0, Failed: 1, Skipped: 0",
      ),
    ); // Corrected log prefix
  });
});
