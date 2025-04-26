import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as ngeohash from 'ngeohash';
import { Job } from 'bull';

import { VenueScanConsumer } from '../../jobs/venue-scan.consumer';
import { GoogleMapsService } from '../../services/google-maps.service';
import { VenueRepository } from '../../repositories/venue.repository';
import { ScannedAreaRepository } from '../../repositories/scanned-area.repository';
import { VenueTypeRepository } from '../../repositories/venue-type.repository';
import { VenueStatus } from '../../entities/venue.entity';
import { createMockVenue } from 'test/factories/venue.factory';

// Mock ngeohash module
jest.mock('ngeohash', () => ({
  encode: jest.fn(),
  decode: jest.fn().mockReturnValue({ latitude: 40.71327209472656, longitude: -74.00596618652344 }),
}));

// Create a mock Job for testing
const createMockJob = (data: any) => {
  return {
    id: 'test-job-id',
    data,
  } as Job;
};

describe('VenueScanConsumer', () => {
  let consumer: VenueScanConsumer;
  let googleMapsService: GoogleMapsService;
  let venueRepository: VenueRepository;
  let venueTypeRepository: VenueTypeRepository;
  let scannedAreaRepository: ScannedAreaRepository;
  let configService: ConfigService;

  // Mock data
  const testGeohash = 'dr5r7p2';
  const testCoords = { latitude: 40.71327209472656, longitude: -74.00596618652344 };
  const mockVenueTypes = [
    { id: 'bar-id', name: 'Bar' },
    { id: 'club-id', name: 'Nightclub' },
    { id: 'restaurant-id', name: 'Restaurant' },
  ];
  
  // Mock place data
  const mockNearbyPlaces = [
    { place_id: 'place1', name: 'Test Bar' },
    { place_id: 'place2', name: 'Test Club' },
  ];
  
  const mockPlaceDetails = {
    place_id: 'place1',
    name: 'Test Bar',
    formatted_address: '123 Test St',
    geometry: {
      location: {
        lat: testCoords.latitude,
        lng: testCoords.longitude
      }
    },
    rating: 4.5,
    user_ratings_total: 100,
    price_level: 2,
    website: 'https://test.com',
    formatted_phone_number: '555-1234',
    opening_hours: {
      open_now: true
    },
    types: ['bar', 'restaurant']
  };

  // Create mocks for all dependencies
  let googleMapsServiceMock: any;
  let venueRepositoryMock: any;
  let venueTypeRepositoryMock: any;
  let scannedAreaRepositoryMock: any;
  let configServiceMock: any;

  beforeEach(async () => {
    // Reset and recreate all mocks
    jest.clearAllMocks();
    
    googleMapsServiceMock = {
      searchNearby: jest.fn().mockResolvedValue(mockNearbyPlaces),
      getPlaceDetails: jest.fn().mockResolvedValue(mockPlaceDetails),
    };

    venueRepositoryMock = {
      findByGooglePlaceId: jest.fn().mockResolvedValue(null), // Default to not found
      create: jest.fn().mockImplementation(data => createMockVenue(data)),
      update: jest.fn().mockImplementation((id, data) => createMockVenue({ id, ...data })),
    };

    venueTypeRepositoryMock = {
      findByNames: jest.fn().mockResolvedValue(mockVenueTypes),
    };

    scannedAreaRepositoryMock = {
      upsertLastScanned: jest.fn().mockResolvedValue(undefined),
    };

    configServiceMock = {
      get: jest.fn().mockImplementation((key, defaultValue) => {
        if (key === 'VENUE_SCAN_RADIUS_METERS') return 1000;
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VenueScanConsumer,
        {
          provide: GoogleMapsService,
          useValue: googleMapsServiceMock,
        },
        {
          provide: VenueRepository,
          useValue: venueRepositoryMock,
        },
        {
          provide: VenueTypeRepository,
          useValue: venueTypeRepositoryMock,
        },
        {
          provide: ScannedAreaRepository,
          useValue: scannedAreaRepositoryMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    consumer = module.get<VenueScanConsumer>(VenueScanConsumer);
    googleMapsService = module.get<GoogleMapsService>(GoogleMapsService);
    venueRepository = module.get<VenueRepository>(VenueRepository);
    venueTypeRepository = module.get<VenueTypeRepository>(VenueTypeRepository);
    scannedAreaRepository = module.get<ScannedAreaRepository>(ScannedAreaRepository);
    configService = module.get<ConfigService>(ConfigService);

    // Spy on logger to prevent console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  describe('processScanAreaJob', () => {
    it('should process a job successfully - happy path', async () => {
      // Create a mock job
      const job = createMockJob({ geohashPrefix: testGeohash });

      // Process the job
      await consumer.processScanAreaJob(job);

      // Verify configuration was read
      expect(configService.get).toHaveBeenCalledWith('VENUE_SCAN_RADIUS_METERS', 1000);

      // Verify Google API calls
      expect(googleMapsService.searchNearby).toHaveBeenCalled();
      expect(googleMapsService.getPlaceDetails).toHaveBeenCalledWith('place1');

      // Verify venue type mapping
      expect(venueTypeRepository.findByNames).toHaveBeenCalledWith(['Bar', 'Restaurant']);

      // Verify venue creation
      expect(venueRepository.findByGooglePlaceId).toHaveBeenCalledWith('place1');
      expect(venueRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Test Bar',
        address: '123 Test St',
        googlePlaceId: 'place1',
        status: VenueStatus.PENDING,
        location: expect.stringContaining('POINT')
      }));

      // Verify scanned area was updated
      expect(scannedAreaRepository.upsertLastScanned).toHaveBeenCalledWith(
        testGeohash,
        expect.any(Date)
      );
    });

    it('should handle venue database errors gracefully', async () => {
      // Mock a database error for venue creation
      venueRepositoryMock.create.mockRejectedValueOnce(new Error('DB Error'));

      // Create a mock job
      const job = createMockJob({ geohashPrefix: testGeohash });

      // Process the job
      await consumer.processScanAreaJob(job);

      // Should still update the scanned area timestamp despite venue errors
      expect(scannedAreaRepository.upsertLastScanned).toHaveBeenCalled();
    });

    it('should throw error for job-level failures', async () => {
      // Configure ngeohash.decode to throw for this test case only
      (ngeohash.decode as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Critical decode error');
      });

      // Create a mock job
      const job = createMockJob({ geohashPrefix: 'invalid-geohash' });

      // The job should throw an error so BullMQ can mark it as failed
      await expect(consumer.processScanAreaJob(job)).rejects.toThrow('Critical decode error');

      // Should not update scanned area on critical failures
      expect(scannedAreaRepository.upsertLastScanned).not.toHaveBeenCalled();
    });
  });
}); 