import { Test, TestingModule } from "@nestjs/testing";
import { Logger, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { VenueMapService } from "../../services/venue-map.service";
import { VenueRepository } from "../../repositories/venue.repository";
import { VenueTypeRepository } from "../../repositories/venue-type.repository";
import { GoogleMapsService } from "../../services/google-maps.service";
import { ScannedAreaRepository } from "../../repositories/scanned-area.repository";
import { VenueScanProducerService } from "../../services/venue-scan-producer.service";
import { VenueSearchDto, VenueSortBy } from "../../dto/venue-search.dto";
import { createMockVenue } from "test/factories/venue.factory";

describe("VenueMapService", () => {
  let service: VenueMapService;
  let venueRepository: VenueRepository;
  let venueScanProducerService: VenueScanProducerService;

  // Mock data for tests
  const mockSearchDto: VenueSearchDto = {
    latitude: 40.7128,
    longitude: -74.006,
    radius: 5,
    query: "test",
    sortBy: VenueSortBy.DISTANCE,
    order: "ASC",
    limit: 10,
    offset: 0,
  };

  const mockVenues = [
    createMockVenue({ id: "venue1" }),
    createMockVenue({ id: "venue2" }),
  ];

  beforeEach(async () => {
    // Create mocks for all dependencies
    const venueRepositoryMock = {
      search: jest.fn().mockResolvedValue([mockVenues, mockVenues.length]),
    };

    const venueScanProducerServiceMock = {
      enqueueScanIfStale: jest.fn().mockResolvedValue(undefined),
    };

    const venueTypeRepositoryMock = {
      findAll: jest.fn().mockResolvedValue([]),
      findByNames: jest.fn().mockResolvedValue([]),
    };

    const googleMapsServiceMock = {
      searchNearby: jest.fn().mockResolvedValue([]),
      getPlaceDetails: jest.fn().mockResolvedValue({}),
      geocodeAddress: jest
        .fn()
        .mockResolvedValue({ latitude: 40.7128, longitude: -74.006 }),
    };

    const scannedAreaRepositoryMock = {
      findLastScanned: jest.fn().mockResolvedValue(null),
      upsertLastScanned: jest.fn().mockResolvedValue(undefined),
    };

    const configServiceMock = {
      get: jest.fn().mockImplementation((key, defaultValue) => defaultValue),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VenueMapService,
        {
          provide: VenueRepository,
          useValue: venueRepositoryMock,
        },
        {
          provide: VenueTypeRepository,
          useValue: venueTypeRepositoryMock,
        },
        {
          provide: GoogleMapsService,
          useValue: googleMapsServiceMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
        {
          provide: ScannedAreaRepository,
          useValue: scannedAreaRepositoryMock,
        },
        {
          provide: VenueScanProducerService,
          useValue: venueScanProducerServiceMock,
        },
      ],
    }).compile();

    service = module.get<VenueMapService>(VenueMapService);
    venueRepository = module.get<VenueRepository>(VenueRepository);
    venueScanProducerService = module.get<VenueScanProducerService>(
      VenueScanProducerService,
    );

    // Spy on logger to prevent console output during tests
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "debug").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("searchVenues", () => {
    it("should return local DB results and trigger background scan asynchronously", async () => {
      const result = await service.searchVenues(mockSearchDto);

      // Verify DB was searched
      expect(venueRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: mockSearchDto.latitude,
          longitude: mockSearchDto.longitude,
        }),
      );

      // Verify DB results were returned
      expect(result).toEqual({
        venues: mockVenues,
        total: mockVenues.length,
      });

      // Verify background scan was triggered
      expect(venueScanProducerService.enqueueScanIfStale).toHaveBeenCalledWith(
        mockSearchDto.latitude,
        mockSearchDto.longitude,
      );
    });

    it("should throw error when latitude/longitude are not provided", async () => {
      const invalidDto = {
        ...mockSearchDto,
        latitude: undefined,
        longitude: undefined,
      };

      await expect(service.searchVenues(invalidDto)).rejects.toThrow(
        BadRequestException,
      );

      // Verify scan was not triggered
      expect(
        venueScanProducerService.enqueueScanIfStale,
      ).not.toHaveBeenCalled();
    });

    it("should handle errors and still return results", async () => {
      // Mock a database error
      jest
        .spyOn(venueRepository, "search")
        .mockRejectedValueOnce(new Error("DB Error"));

      // Should not throw but return empty results
      const result = await service.searchVenues(mockSearchDto);

      expect(result).toEqual({
        venues: [],
        total: 0,
      });

      // Even with DB error, scan should still be triggered
      expect(venueScanProducerService.enqueueScanIfStale).toHaveBeenCalled();
    });

    it("should handle errors in the background scan without affecting results", async () => {
      // Mock an error in the producer service
      jest
        .spyOn(venueScanProducerService, "enqueueScanIfStale")
        .mockRejectedValueOnce(new Error("Scan Error"));

      // Should complete successfully despite scan error
      const result = await service.searchVenues(mockSearchDto);

      // Results should still be returned
      expect(result).toEqual({
        venues: mockVenues,
        total: mockVenues.length,
      });
    });
  });

  describe("getVenuesNearLocation", () => {
    it("should search DB and trigger background scan", async () => {
      const lat = 40.7128;
      const lon = -74.006;
      const radius = 5;

      await service.getVenuesNearLocation(lat, lon, radius);

      // Verify DB was searched with correct parameters
      expect(venueRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: lat,
          longitude: lon,
          radiusMiles: radius,
          sortBy: VenueSortBy.DISTANCE,
        }),
      );

      // Verify scan was triggered
      expect(venueScanProducerService.enqueueScanIfStale).toHaveBeenCalledWith(
        lat,
        lon,
      );
    });

    it("should handle errors and still trigger scans", async () => {
      // Mock a database error
      jest
        .spyOn(venueRepository, "search")
        .mockRejectedValueOnce(new Error("DB Error"));

      // Call should not throw
      const result = await service.getVenuesNearLocation(40.7128, -74.006, 5);

      // Should return empty array on error
      expect(result).toEqual([]);

      // Scan should still be triggered
      expect(venueScanProducerService.enqueueScanIfStale).toHaveBeenCalled();
    });
  });
});
