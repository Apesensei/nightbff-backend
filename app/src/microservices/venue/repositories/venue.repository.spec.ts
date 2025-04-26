import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, LessThan, IsNull, ObjectLiteral } from 'typeorm';
import { VenueRepository } from './venue.repository';
import { Venue } from '../entities/venue.entity';
import { createMockVenue } from 'test/factories/venue.factory';
import { VenueSearchOptions } from './venue.repository';
import { VenueSortBy } from '../dto/venue-search.dto';

// Simple mock for QueryBuilder
const createMockQueryBuilder = () => {
  const mockQB = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[createMockVenue()], 1]),
    getQuery: jest.fn().mockReturnValue('mock query'),
    subQuery: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getQuery: jest.fn().mockReturnValue('mock subquery'),
    }),
  };
  return mockQB;
};

describe('VenueRepository', () => {
  let venueRepository: VenueRepository;
  let mockTypeOrmRepo: Partial<Repository<Venue>>;
  let mockQueryBuilder: any;

  beforeEach(async () => {
    // Create fresh mock query builder for each test
    mockQueryBuilder = createMockQueryBuilder();
    
    // Create mock TypeORM repository with minimal functionality
    mockTypeOrmRepo = {
      findOne: jest.fn(),
      find: jest.fn() as jest.Mock,
      findAndCount: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      increment: jest.fn(),
      decrement: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VenueRepository,
        {
          provide: getRepositoryToken(Venue),
          useValue: mockTypeOrmRepo,
        },
      ],
    }).compile();

    venueRepository = module.get<VenueRepository>(VenueRepository);
  });

  it('should be defined', () => {
    expect(venueRepository).toBeDefined();
  });

  describe('findStaleLocations', () => {
    const cutoffDate = new Date();
    const limit = 10;
    const mockStaleVenues = [createMockVenue()];

    it('should call find with correct options for stale locations', async () => {
      (mockTypeOrmRepo.find as jest.Mock).mockResolvedValue(mockStaleVenues);

      const result = await venueRepository.findStaleLocations(cutoffDate, limit);
      
      expect(mockTypeOrmRepo.find).toHaveBeenCalledWith({
        select: ['id', 'location'],
        where: [
          { lastRefreshed: IsNull() },
          { lastRefreshed: LessThan(cutoffDate) }
        ],
        take: limit,
        order: { lastRefreshed: 'ASC' }
      });
      expect(result).toEqual(mockStaleVenues);
    });

    it('should return an empty array if no stale locations are found', async () => {
      (mockTypeOrmRepo.find as jest.Mock).mockResolvedValue([]);
      
      const result = await venueRepository.findStaleLocations(cutoffDate, limit);
      
      expect(result).toEqual([]);
    });
  });

  describe('search (PostGIS query building)', () => {
    const mockVenues = [createMockVenue()];
    const mockTotal = 1;

    beforeEach(() => {
      // Set default return value for query execution
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockVenues, mockTotal]);
    });

    it('should build query with ST_DWithin and ST_Distance...', async () => {
      // APPROACH: Directly replace the underlying repository methods
      
      const options: VenueSearchOptions = {
        latitude: 40.7128,
        longitude: -74.0060,
        radiusMiles: 5,
        sortBy: VenueSortBy.DISTANCE,
        order: 'ASC',
        limit: 10,
        offset: 0,
      };

      const result = await venueRepository.search(options);

      // Verify the query builder was created
      expect(mockTypeOrmRepo.createQueryBuilder).toHaveBeenCalledWith('venue');
      
      // Verify joins were created
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledTimes(3);
      
      // Verify ST_DWithin filter was added
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ST_DWithin'),
        expect.objectContaining({
          latitude: options.latitude,
          longitude: options.longitude,
          radiusMeters: options.radiusMiles! * 1609.34,
        })
      );
      
      // Verify ST_Distance calculation was added
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        expect.stringContaining('ST_Distance'),
        'distance'
      );
      
      // Verify parameters were set
      expect(mockQueryBuilder.setParameter).toHaveBeenCalledWith('latitude', options.latitude);
      expect(mockQueryBuilder.setParameter).toHaveBeenCalledWith('longitude', options.longitude);
      
      // Verify ordering
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('distance', 'ASC');
      
      // Verify pagination
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(options.limit);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(options.offset);
      
      // Verify the query was executed
      expect(mockQueryBuilder.getManyAndCount).toHaveBeenCalled();
      
      // Verify the result
      expect(result).toEqual([mockVenues, mockTotal]);
    });

    it('should NOT order by distance if sortBy is not DISTANCE', async () => {
      const options: VenueSearchOptions = {
        latitude: 40.7128,
        longitude: -74.0060,
        radiusMiles: 5,
        sortBy: VenueSortBy.RATING,
        order: 'DESC',
        limit: 10,
        offset: 0,
      };

      const result = await venueRepository.search(options);

      // Verify ST_Distance is still calculated (for potential future use)
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        expect.stringContaining('ST_Distance'),
        'distance'
      );
      
      // Verify parameters were set correctly
      expect(mockQueryBuilder.setParameter).toHaveBeenCalledWith('latitude', options.latitude);
      expect(mockQueryBuilder.setParameter).toHaveBeenCalledWith('longitude', options.longitude);
      
      // Verify ordering is by rating, not distance
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('venue.rating', 'DESC');
      
      // Verify the result
      expect(result).toEqual([mockVenues, mockTotal]);
    });

    it('should apply other filters like query, openNow, priceLevel, venueTypeIds when provided', async () => {
      const options: VenueSearchOptions = {
        query: 'Coffee',
        openNow: true,
        priceLevel: 2,
        venueTypeIds: ['type1', 'type2'],
        limit: 10,
        offset: 0,
      };

      const result = await venueRepository.search(options);

      // Verify text search filter
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('(LOWER(venue.name) LIKE :query OR LOWER(venue.description) LIKE :query OR LOWER(venue.address) LIKE :query)'),
        expect.objectContaining({ query: `%${options.query?.toLowerCase()}%` })
      );
      
      // Verify venue type filter
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('venueType.id IN (:...venueTypeIds)'),
        expect.objectContaining({ venueTypeIds: options.venueTypeIds })
      );
      
      // Verify price level filter
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('venue.priceLevel = :priceLevel'),
        expect.objectContaining({ priceLevel: options.priceLevel })
      );
      
      // Verify the result
      expect(result).toEqual([mockVenues, mockTotal]);
    });
  });
}); 