import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";
import * as ngeohash from "ngeohash";
import { subHours } from "date-fns";
import { getRepositoryToken } from "@nestjs/typeorm";
import { getQueueToken } from "@nestjs/bull";

import { VenueMaintenanceService } from "../../services/venue-maintenance.service";
import { VenueRepository } from "../../repositories/venue.repository";
import { VenueScanProducerService } from "../../services/venue-scan-producer.service";
import { createMockVenue } from "test/factories/venue.factory";
import { Venue } from "../../entities/venue.entity";

// Mock ngeohash module
jest.mock("ngeohash", () => ({
  encode: jest.fn(),
  decode: jest.fn(),
}));

describe("VenueMaintenanceService", () => {
  let service: VenueMaintenanceService;
  let venueRepository: VenueRepository;
  let venueScanProducerService: VenueScanProducerService;
  let configService: ConfigService;

  // Mock data
  const mockStaleDate = subHours(new Date(), 200); // 200 hours ago (stale)
  const mockLat = 40.71327209472656;
  const mockLon = -74.00596618652344;
  const mockGeohash = "dr5r7p2";

  // Create mock venues with different location scenarios
  const mockValidVenue = createMockVenue({
    id: "valid-id",
    location: `POINT(${mockLon} ${mockLat})`,
    lastRefreshed: mockStaleDate,
  });

  const mockMissingLocationVenue = createMockVenue({
    id: "missing-location-id",
    location: undefined, // Use undefined instead of null
    lastRefreshed: mockStaleDate,
  });

  const mockInvalidLocationVenue = createMockVenue({
    id: "invalid-location-id",
    location: "NOT-A-POINT",
    lastRefreshed: mockStaleDate,
  });

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    // Use namespace for mock setup
    (ngeohash.decode as jest.Mock).mockReturnValue({
      latitude: mockLat,
      longitude: mockLon,
    });
    (ngeohash.encode as jest.Mock).mockReturnValue(mockGeohash);

    // ConfigService mock can stay as useValue
    const configServiceMock = {
      get: jest.fn().mockImplementation((key, defaultValue) => {
        if (key === "VENUE_SCAN_STALENESS_THRESHOLD_HOURS") return 168;
        if (key === "GEOHASH_PRECISION") return 7;
        return defaultValue;
      }),
    };

    // --- Revert to useValue Mocks ---
    const venueRepositoryMock = {
      findStaleLocations: jest
        .fn()
        .mockResolvedValue([
          mockValidVenue,
          mockMissingLocationVenue,
          mockInvalidLocationVenue,
        ]),
      // Add other methods if needed by the service
    };
    const venueScanProducerServiceMock = {
      enqueueScanIfStale: jest.fn().mockResolvedValue(undefined),
    };
    // Remove mocks for TypeORM/Bull dependencies
    // const mockTypeOrmVenueRepository = { ... };
    // const mockBullQueue = { ... };
    // const mockTypeOrmScannedAreaRepository = { ... };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VenueMaintenanceService,
        // Remove actual services
        // VenueRepository,
        // VenueScanProducerService,
        // ScannedAreaRepository,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
        // Provide mocks using useValue again
        {
          provide: VenueRepository,
          useValue: venueRepositoryMock,
        },
        {
          provide: VenueScanProducerService,
          useValue: venueScanProducerServiceMock,
        },
        // Remove mocks for injected dependencies
        // { provide: getRepositoryToken(Venue), useValue: ... },
        // { provide: getRepositoryToken(ScannedArea), useValue: ... },
        // { provide: getQueueToken('venue-scan'), useValue: ... },
      ],
    }).compile();

    service = module.get<VenueMaintenanceService>(VenueMaintenanceService);
    // Get mock instances directly (no need for module.get for these)
    venueRepository = venueRepositoryMock as any; // Cast if needed
    venueScanProducerService = venueScanProducerServiceMock as any; // Cast if needed
    configService = module.get<ConfigService>(ConfigService);

    // Remove spy setups (mocks are used directly)
    // jest.spyOn(venueRepository, 'findStaleLocations')...
    // jest.spyOn(venueScanProducerService, 'enqueueScanIfStale')...

    // Logger spies
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => {});
    // jest.spyOn(Logger.prototype, "debug").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("runStalenessCheckLogic", () => {
    it("should return early if no stale venues are found", async () => {
      // Mock empty stale venues result
      jest
        .spyOn(venueRepository, "findStaleLocations")
        .mockResolvedValueOnce([]);

      const result = await service.runStalenessCheckLogic();

      // Verify config reads
      expect(configService.get).toHaveBeenCalledWith(
        "VENUE_SCAN_STALENESS_THRESHOLD_HOURS",
        168,
      );
      expect(configService.get).toHaveBeenCalledWith("GEOHASH_PRECISION", 7);

      // Verify repository call
      expect(venueRepository.findStaleLocations).toHaveBeenCalled();

      // Verify producer service was not called
      expect(
        venueScanProducerService.enqueueScanIfStale,
      ).not.toHaveBeenCalled();

      // Verify the return values
      expect(result).toEqual({
        staleVenuesCount: 0,
        uniqueGeohashCount: 0,
        enqueuedCount: 0,
        decodeErrors: 0,
      });
    });

    it("should process valid locations and handle missing/invalid locations", async () => {
      // --- Test-Specific Mock Overrides ---
      // Use namespace for mock setup
      (ngeohash.decode as jest.Mock).mockReturnValue({
        latitude: mockLat,
        longitude: mockLon,
      });
      (ngeohash.encode as jest.Mock).mockReturnValue(mockGeohash);

      // Explicitly mock findStaleLocations for this test
      (venueRepository.findStaleLocations as jest.Mock).mockResolvedValueOnce([
        mockValidVenue, // The one that should trigger encode/enqueue
        mockMissingLocationVenue, // Should be skipped
        mockInvalidLocationVenue, // Should cause decodeError
      ]);

      // Ensure the producer mock is ready (it should be from beforeEach, but reset for clarity)
      (venueScanProducerService.enqueueScanIfStale as jest.Mock)
        .mockClear()
        .mockResolvedValue(undefined);
      // --- End Overrides ---

      const result = await service.runStalenessCheckLogic();

      // Assertions
      expect(venueRepository.findStaleLocations).toHaveBeenCalledTimes(1); // Verify the override was called
      expect(venueRepository.findStaleLocations).toHaveBeenCalledWith(
        expect.any(Date),
      );

      // Verify encode was called via namespace
      expect(ngeohash.encode).toHaveBeenCalledWith(mockLat, mockLon, 7);

      // Verify the producer was called for the decoded geohash from the valid venue
      expect(venueScanProducerService.enqueueScanIfStale).toHaveBeenCalledTimes(
        1,
      );
      expect(venueScanProducerService.enqueueScanIfStale).toHaveBeenCalledWith(
        mockLat, // Because decode mock returns this
        mockLon,
      );

      // Verify the final result object
      expect(result).toEqual({
        staleVenuesCount: 3,
        uniqueGeohashCount: 1,
        enqueuedCount: 1,
        decodeErrors: 1,
      });
    });

    it("should handle geohash decode errors", async () => {
      // Use namespace
      (ngeohash.decode as jest.Mock).mockImplementationOnce(() => {
        throw new Error("Decode error");
      });

      const result = await service.runStalenessCheckLogic();
      // Restore original expectation
      expect(result).toEqual({
        staleVenuesCount: 3,
        uniqueGeohashCount: 1, // Correct: Encode loop finds 1 valid geohash
        enqueuedCount: 0,
        decodeErrors: 2,
      });
    });

    it("should deduplicate multiple venues in the same geohash area", async () => {
      // Create two venues in the same geohash area
      const venue1 = createMockVenue({
        id: "venue1",
        location: `POINT(${mockLon} ${mockLat})`,
        lastRefreshed: mockStaleDate,
      });

      const venue2 = createMockVenue({
        id: "venue2",
        location: `POINT(${mockLon + 0.0001} ${mockLat + 0.0001})`, // Very close to venue1, same geohash
        lastRefreshed: mockStaleDate,
      });

      jest
        .spyOn(venueRepository, "findStaleLocations")
        .mockResolvedValueOnce([venue1, venue2]);

      const result = await service.runStalenessCheckLogic();

      // Even though there are 2 venues, we should only enqueue once for the unique geohash
      expect(venueScanProducerService.enqueueScanIfStale).toHaveBeenCalledTimes(
        1,
      );

      // Verify the return values
      expect(result).toEqual({
        staleVenuesCount: 2,
        uniqueGeohashCount: 1, // Only one unique geohash
        enqueuedCount: 1,
        decodeErrors: 0,
      });
    });

    it("should handle errors during enqueueScanIfStale", async () => {
      // Configure the direct mock object
      (
        venueScanProducerService.enqueueScanIfStale as jest.Mock
      ).mockRejectedValueOnce(new Error("Producer error"));

      const result = await service.runStalenessCheckLogic();

      // Assert mock call
      expect(venueScanProducerService.enqueueScanIfStale).toHaveBeenCalledTimes(
        1,
      );
      // Original expectation
      expect(result).toEqual({
        staleVenuesCount: 3,
        uniqueGeohashCount: 1,
        enqueuedCount: 0,
        decodeErrors: 2, // 1 invalid format + 1 enqueue error
      });
    });

    it("should process valid locations and handle geohash decode errors", async () => {
      // This test implicitly relies on the default mocks, ensure they are correct
      // Add specific mocks if needed to guarantee behavior
      const result = await service.runStalenessCheckLogic();

      expect(venueScanProducerService.enqueueScanIfStale).toHaveBeenCalledTimes(
        1,
      ); // Should be called for the valid one
      expect(venueScanProducerService.enqueueScanIfStale).toHaveBeenCalledWith(
        mockLat,
        mockLon,
      );
      expect(result).toEqual({
        staleVenuesCount: 3,
        uniqueGeohashCount: 1,
        enqueuedCount: 1,
        decodeErrors: 1, // From the invalid format venue
      });
    });

    it("should handle multiple geohash decode errors", async () => {
      // Use namespace
      (ngeohash.encode as jest.Mock).mockImplementation((lat, lon) => {
        // This mock will only be called for the valid venue in the default test setup
        if (lat === mockLat && lon === mockLon) return mockGeohash;
        // It won't be called for the invalid format or missing location venues
        throw new Error("Simulated encode error");
      });
      // Use namespace
      (ngeohash.decode as jest.Mock).mockReturnValue({
        latitude: mockLat,
        longitude: mockLon,
      });

      const result = await service.runStalenessCheckLogic();

      expect(venueScanProducerService.enqueueScanIfStale).toHaveBeenCalledTimes(
        1,
      );
      expect(result).toEqual({
        staleVenuesCount: 3,
        uniqueGeohashCount: 1,
        enqueuedCount: 1,
        decodeErrors: 1, // Correct: Only 1 error from invalid format venue
      });
    });
  });
});
