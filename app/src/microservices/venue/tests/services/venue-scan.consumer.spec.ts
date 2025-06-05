import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";
import * as ngeohash from "ngeohash";
import { Job } from "bull";
import { of } from "rxjs";

import { VenueScanConsumer } from "../../jobs/venue-scan.consumer";
import { GoogleMapsService } from "../../services/google-maps.service";
import { VenueRepository } from "../../repositories/venue.repository";
import { ScannedAreaRepository } from "../../repositories/scanned-area.repository";
import { VenueTypeRepository } from "../../repositories/venue-type.repository";
import { VenueStatus } from "../../entities/venue.entity";
import { createMockVenue } from "test/factories/venue.factory";
import { Venue } from "../../entities/venue.entity";
import { VenueType } from "../../entities/venue-type.entity";
import { ScannedArea } from "../../entities/scanned-area.entity";

// Mock ngeohash module
jest.mock("ngeohash", () => ({
  encode: jest.fn(),
  decode: jest.fn().mockReturnValue({
    latitude: 40.71327209472656,
    longitude: -74.00596618652344,
  }),
}));

// Create a mock Job for testing
const createMockJob = (data: any) => {
  return {
    id: "test-job-id",
    data,
  } as Job;
};

describe("VenueScanConsumer", () => {
  let consumer: VenueScanConsumer;
  let googleMapsService: GoogleMapsService;
  let venueRepository: VenueRepository;
  let venueTypeRepository: VenueTypeRepository;
  let scannedAreaRepository: ScannedAreaRepository;
  let configService: ConfigService;

  // Mock data
  const testGeohash = "dr5r7p2";
  const testCoords = {
    latitude: 40.71327209472656,
    longitude: -74.00596618652344,
  };
  const mockVenueTypes = [
    { id: "bar-id", name: "Bar" },
    { id: "club-id", name: "Nightclub" },
    { id: "restaurant-id", name: "Restaurant" },
  ];

  // Mock place data
  const mockNearbyPlaces = [
    { place_id: "place1", name: "Test Bar" },
    { place_id: "place2", name: "Test Club" },
  ];

  const mockPlaceDetails = {
    place_id: "place1",
    name: "Test Bar",
    formatted_address: "123 Test St",
    geometry: {
      location: {
        lat: testCoords.latitude,
        lng: testCoords.longitude,
      },
    },
    rating: 4.5,
    user_ratings_total: 100,
    price_level: 2,
    website: "https://test.com",
    formatted_phone_number: "555-1234",
    opening_hours: {
      open_now: true,
    },
    types: ["bar", "restaurant"],
  };

  // Create mocks for all dependencies
  let scannedAreaRepositoryMock: any;
  let configServiceMock: any;
  let mockGoogleMapsService: any;
  let mockVenueRepository: any;
  let mockVenueTypeRepository: any;
  let mockScannedAreaRepository: any;

  // Move factory definitions before beforeEach
  const mockGoogleMapsServiceFactory = () => ({
    searchNearby: jest.fn().mockResolvedValue([]), // Default empty
    getPlaceDetails: jest.fn().mockResolvedValue(null), // Default null
  });
  const mockVenueRepositoryFactory = () => ({
    findByGooglePlaceId: jest.fn().mockResolvedValue(null),
    create: jest
      .fn()
      .mockImplementation((data) => ({ id: "new-venue-id", ...data })),
    update: jest.fn().mockImplementation((id, data) => ({ id, ...data })),
  });
  const mockVenueTypeRepositoryFactory = () => ({
    findByNames: jest.fn().mockResolvedValue([]),
  });
  const mockScannedAreaRepositoryFactory = () => ({
    upsertLastScanned: jest.fn(),
  });

  // Define mockPlanClient before beforeEach
  const mockPlanClient = {
    send: jest.fn().mockReturnValue(of(null)),
  };

  beforeEach(async () => {
    // Reset mocks before each test
    mockGoogleMapsService = mockGoogleMapsServiceFactory();
    mockVenueRepository = mockVenueRepositoryFactory();
    mockVenueTypeRepository = mockVenueTypeRepositoryFactory();
    mockScannedAreaRepository = mockScannedAreaRepositoryFactory();
    mockPlanClient.send.mockClear(); // Clear mock calls

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VenueScanConsumer,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === "VENUE_SCAN_RADIUS_METERS") return 1000;
              return defaultValue;
            }),
          },
        },
        {
          provide: GoogleMapsService,
          useValue: mockGoogleMapsService,
        },
        {
          provide: VenueRepository,
          useValue: mockVenueRepository,
        },
        {
          provide: VenueTypeRepository,
          useValue: mockVenueTypeRepository,
        },
        {
          provide: ScannedAreaRepository,
          useValue: mockScannedAreaRepository,
        },
        // Add the mock provider for PLAN_SERVICE_RPC
        {
          provide: "PLAN_SERVICE_RPC",
          useValue: mockPlanClient,
        },
      ],
    }).compile();

    consumer = module.get<VenueScanConsumer>(VenueScanConsumer);
    googleMapsService = module.get<GoogleMapsService>(GoogleMapsService);
    venueRepository = module.get<VenueRepository>(VenueRepository);
    venueTypeRepository = module.get<VenueTypeRepository>(VenueTypeRepository);
    scannedAreaRepository = module.get<ScannedAreaRepository>(
      ScannedAreaRepository,
    );
    configService = module.get<ConfigService>(ConfigService);

    // Spy on logger to prevent console output during tests
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "debug").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
  });

  it("should be defined", () => {
    expect(consumer).toBeDefined();
  });

  describe("processScanAreaJob", () => {
    it("should process a job successfully - happy path", async () => {
      // Create a mock job
      const job = createMockJob({ geohashPrefix: testGeohash });

      // --- Setup Mocks for this specific test --- START
      // Use the module-retrieved googleMapsService instance for mocks
      const typedMockNearbyPlaces: any[] = mockNearbyPlaces.map((p) => ({
        // Add types/casting if needed
        ...p,
        geometry: { location: { lat: 0, lng: 0 } }, // Add minimal required geometry
        formatted_address: "mock address",
        // Add other required fields from GoogleMapsPlaceResult if necessary
      }));
      jest
        .spyOn(googleMapsService, "searchNearby")
        .mockResolvedValueOnce(typedMockNearbyPlaces);

      jest
        .spyOn(googleMapsService, "getPlaceDetails")
        .mockImplementationOnce(async (placeId: string) => {
          if (placeId === "place1") {
            return mockPlaceDetails; // Assuming mockPlaceDetails matches PlaceDetailsResult
          }
          return null;
        });
      // Use the module-retrieved venueTypeRepository instance for mocks
      jest
        .spyOn(venueTypeRepository, "findByNames")
        .mockImplementationOnce(
          async (types: string[]): Promise<VenueType[]> => {
            // Add explicit return type
            const foundTypes = types
              .map((type) => {
                let mockType: Partial<VenueType> | null = null;
                if (type.toLowerCase() === "bar")
                  mockType = { id: "bar-id", name: "Bar" };
                if (type.toLowerCase() === "restaurant")
                  mockType = { id: "restaurant-id", name: "Restaurant" };

                // Add required fields for VenueType
                return mockType
                  ? ({
                      ...mockType,
                      description: "mock",
                      iconUrl: "mock",
                      venues: [],
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    } as VenueType)
                  : null;
              })
              .filter((t): t is VenueType => t !== null);
            return foundTypes;
          },
        );

      // !! Use the module-retrieved venueRepository instance to set the mock !!
      jest
        .spyOn(venueRepository, "findByGooglePlaceId")
        .mockResolvedValueOnce(null);
      // We also need to ensure the 'create' mock is set on the retrieved instance if used
      // Ensure the mock returns a valid Venue object
      jest
        .spyOn(venueRepository, "create")
        .mockImplementation(async (data): Promise<Venue> => {
          // Provide default values for required fields
          const defaults: Partial<Venue> = {
            name: "Default Name",
            address: "Default Address",
            location: "POINT(0 0)",
            status: VenueStatus.PENDING,
            venueTypes: [],
            lastRefreshed: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            // Add other non-nullable fields from Venue entity if needed
            id: "new-venue-id", // Ensure ID is present
          };
          return { ...defaults, ...data, id: "new-venue-id" } as Venue; // Cast to Venue
        });

      // Use module retrieved scannedAreaRepository
      // Return a mock ScannedArea object matching the entity
      jest.spyOn(scannedAreaRepository, "upsertLastScanned").mockResolvedValue({
        geohashPrefix: testGeohash, // Correct property name
        lastScannedAt: new Date(), // Correct property name
        // Add other fields from ScannedArea if necessary
      } as ScannedArea); // Cast to ScannedArea

      // --- Setup Mocks for this specific test --- END

      // Process the job
      await consumer.processScanAreaJob(job);

      // Verify configuration was read
      expect(configService.get).toHaveBeenCalledWith(
        "VENUE_SCAN_RADIUS_METERS",
        1000,
      );

      // Verify Google API calls
      expect(googleMapsService.searchNearby).toHaveBeenCalled();
      expect(googleMapsService.getPlaceDetails).toHaveBeenCalledWith("place1");

      // Verify venue type mapping
      expect(venueTypeRepository.findByNames).toHaveBeenCalledWith([
        "Bar",
        "Restaurant",
      ]);

      // Verify venue creation
      expect(venueRepository.findByGooglePlaceId).toHaveBeenCalledWith(
        "place1",
      );
      expect(venueRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test Bar",
          address: "123 Test St",
          googlePlaceId: "place1",
          status: VenueStatus.PENDING,
          location: expect.stringContaining("POINT"),
        }),
      );

      // Verify scanned area was updated
      expect(scannedAreaRepository.upsertLastScanned).toHaveBeenCalledWith(
        testGeohash,
        expect.any(Date),
      );
    });

    it("should handle venue database errors gracefully", async () => {
      // Mock a database error for venue creation
      mockVenueRepository.create.mockRejectedValueOnce(new Error("DB Error"));

      // Create a mock job
      const job = createMockJob({ geohashPrefix: testGeohash });

      // Process the job
      await consumer.processScanAreaJob(job);

      // Should still update the scanned area timestamp despite venue errors
      expect(mockScannedAreaRepository.upsertLastScanned).toHaveBeenCalled();
    });

    it("should throw error for job-level failures", async () => {
      // Configure ngeohash.decode to throw for this test case only
      (ngeohash.decode as jest.Mock).mockImplementationOnce(() => {
        throw new Error("Critical decode error");
      });

      // Create a mock job
      const job = createMockJob({ geohashPrefix: "invalid-geohash" });

      // The job should throw an error so BullMQ can mark it as failed
      await expect(consumer.processScanAreaJob(job)).rejects.toThrow(
        "Critical decode error",
      );

      // Should not update scanned area on critical failures
      expect(
        mockScannedAreaRepository.upsertLastScanned,
      ).not.toHaveBeenCalled();
    });
  });
});
