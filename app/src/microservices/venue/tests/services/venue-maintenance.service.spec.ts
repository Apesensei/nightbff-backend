import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as ngeohash from 'ngeohash';
import { subHours } from 'date-fns';

import { VenueMaintenanceService } from '../../services/venue-maintenance.service';
import { VenueRepository } from '../../repositories/venue.repository';
import { VenueScanProducerService } from '../../services/venue-scan-producer.service';
import { createMockVenue } from 'test/factories/venue.factory';

// Mock ngeohash module
jest.mock('ngeohash', () => ({
  encode: jest.fn(),
  decode: jest.fn(),
}));

describe('VenueMaintenanceService', () => {
  let service: VenueMaintenanceService;
  let venueRepository: VenueRepository;
  let venueScanProducerService: VenueScanProducerService;
  let configService: ConfigService;

  // Mock data
  const mockStaleDate = subHours(new Date(), 200); // 200 hours ago (stale)
  const mockLat = 40.71327209472656;
  const mockLon = -74.00596618652344;
  const mockGeohash = 'dr5r7p2';
  
  // Create mock venues with different location scenarios
  const mockValidVenue = createMockVenue({
    id: 'valid-id',
    location: `POINT(${mockLon} ${mockLat})`,
    lastRefreshed: mockStaleDate
  });
  
  const mockMissingLocationVenue = createMockVenue({
    id: 'missing-location-id',
    location: undefined, // Use undefined instead of null
    lastRefreshed: mockStaleDate
  });
  
  const mockInvalidLocationVenue = createMockVenue({
    id: 'invalid-location-id',
    location: 'NOT-A-POINT',
    lastRefreshed: mockStaleDate
  });

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Set up ngeohash.decode mock implementation
    (ngeohash.decode as jest.Mock).mockReturnValue({ latitude: mockLat, longitude: mockLon });
    
    // Set up ngeohash.encode mock implementation
    (ngeohash.encode as jest.Mock).mockReturnValue(mockGeohash);
    
    // Create mocks for all dependencies
    const venueRepositoryMock = {
      findStaleLocations: jest.fn().mockResolvedValue([
        mockValidVenue,
        mockMissingLocationVenue,
        mockInvalidLocationVenue
      ]),
    };

    const venueScanProducerServiceMock = {
      enqueueScanIfStale: jest.fn().mockResolvedValue(undefined),
    };

    const configServiceMock = {
      get: jest.fn().mockImplementation((key, defaultValue) => {
        if (key === 'VENUE_SCAN_STALENESS_THRESHOLD_HOURS') return 168;
        if (key === 'GEOHASH_PRECISION') return 7;
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VenueMaintenanceService,
        {
          provide: VenueRepository,
          useValue: venueRepositoryMock,
        },
        {
          provide: VenueScanProducerService,
          useValue: venueScanProducerServiceMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<VenueMaintenanceService>(VenueMaintenanceService);
    venueRepository = module.get<VenueRepository>(VenueRepository);
    venueScanProducerService = module.get<VenueScanProducerService>(VenueScanProducerService);
    configService = module.get<ConfigService>(ConfigService);

    // Spy on logger to prevent console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('runStalenessCheckLogic', () => {
    it('should return early if no stale venues are found', async () => {
      // Mock empty stale venues result
      jest.spyOn(venueRepository, 'findStaleLocations').mockResolvedValueOnce([]);

      const result = await service.runStalenessCheckLogic();

      // Verify config reads
      expect(configService.get).toHaveBeenCalledWith('VENUE_SCAN_STALENESS_THRESHOLD_HOURS', 168);
      expect(configService.get).toHaveBeenCalledWith('GEOHASH_PRECISION', 7);
      
      // Verify repository call
      expect(venueRepository.findStaleLocations).toHaveBeenCalled();
      
      // Verify producer service was not called
      expect(venueScanProducerService.enqueueScanIfStale).not.toHaveBeenCalled();
      
      // Verify the return values
      expect(result).toEqual({
        staleVenuesCount: 0,
        uniqueGeohashCount: 0,
        enqueuedCount: 0,
        decodeErrors: 0
      });
    });

    it('should process valid locations and handle missing/invalid locations', async () => {
      const result = await service.runStalenessCheckLogic();

      // Verify VenueRepository was called with the correct cutoff date
      expect(venueRepository.findStaleLocations).toHaveBeenCalledWith(expect.any(Date));
      
      // Only one venue has a valid location
      expect(venueScanProducerService.enqueueScanIfStale).toHaveBeenCalledTimes(1);
      expect(venueScanProducerService.enqueueScanIfStale).toHaveBeenCalledWith(mockLat, mockLon);
      
      // Verify the return values
      expect(result).toEqual({
        staleVenuesCount: 3,
        uniqueGeohashCount: 1, // Only one unique geohash from the valid venue
        enqueuedCount: 1,
        decodeErrors: 1 // One invalid location (the missing location is skipped, not counted as error)
      });
    });

    it('should handle geohash decode errors', async () => {
      // Configure decode to throw an error on first call
      (ngeohash.decode as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Decode error');
      });

      const result = await service.runStalenessCheckLogic();
      
      // Verify producer service wasn't called (because decode failed)
      expect(venueScanProducerService.enqueueScanIfStale).not.toHaveBeenCalled();
      
      // Verify the return values show the decode error
      expect(result).toEqual({
        staleVenuesCount: 3,
        uniqueGeohashCount: 1,
        enqueuedCount: 0, // No successful enqueues due to decode error
        decodeErrors: 1 // Still only one invalid location error (separate from decode error)
      });
    });

    it('should deduplicate multiple venues in the same geohash area', async () => {
      // Create two venues in the same geohash area
      const venue1 = createMockVenue({
        id: 'venue1',
        location: `POINT(${mockLon} ${mockLat})`,
        lastRefreshed: mockStaleDate
      });
      
      const venue2 = createMockVenue({
        id: 'venue2',
        location: `POINT(${mockLon + 0.0001} ${mockLat + 0.0001})`, // Very close to venue1, same geohash
        lastRefreshed: mockStaleDate
      });
      
      jest.spyOn(venueRepository, 'findStaleLocations').mockResolvedValueOnce([venue1, venue2]);
      
      const result = await service.runStalenessCheckLogic();
      
      // Even though there are 2 venues, we should only enqueue once for the unique geohash
      expect(venueScanProducerService.enqueueScanIfStale).toHaveBeenCalledTimes(1);
      
      // Verify the return values
      expect(result).toEqual({
        staleVenuesCount: 2,
        uniqueGeohashCount: 1, // Only one unique geohash
        enqueuedCount: 1,
        decodeErrors: 0
      });
    });

    it('should handle errors during enqueueScanIfStale', async () => {
      // Mock an error in the producer service
      jest.spyOn(venueScanProducerService, 'enqueueScanIfStale').mockRejectedValueOnce(
        new Error('Enqueue error')
      );
      
      const result = await service.runStalenessCheckLogic();
      
      // The method should complete without throwing, despite the producer error
      expect(result).toEqual({
        staleVenuesCount: 3,
        uniqueGeohashCount: 1,
        enqueuedCount: 0, // No successful enqueues due to error
        decodeErrors: 1
      });
    });
  });
}); 