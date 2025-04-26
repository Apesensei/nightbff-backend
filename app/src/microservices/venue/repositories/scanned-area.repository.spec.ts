import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { ScannedAreaRepository } from './scanned-area.repository';
import { ScannedArea } from '../entities/scanned-area.entity';
import { createMockScannedArea } from 'test/factories/scanned-area.factory';

// Define the type for the mocked TypeORM repository
type MockRepository<T extends ObjectLiteral = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = (): MockRepository<ScannedArea> => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(), // Mock create as it's used internally by the repo's upsert
});

describe('ScannedAreaRepository', () => {
  let repository: ScannedAreaRepository;
  let mockTypeOrmRepository: MockRepository<ScannedArea>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScannedAreaRepository,
        {
          provide: getRepositoryToken(ScannedArea),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    repository = module.get<ScannedAreaRepository>(ScannedAreaRepository);
    mockTypeOrmRepository = module.get<MockRepository<ScannedArea>>(
      getRepositoryToken(ScannedArea),
    );
  });

  // Clear mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findLastScanned', () => {
    it('should call findOne with correct geohashPrefix and return the result', async () => {
      const geohashPrefix = 'dpz8xbc';
      const mockResult = createMockScannedArea({ geohashPrefix });
      mockTypeOrmRepository.findOne!.mockResolvedValue(mockResult);

      const result = await repository.findLastScanned(geohashPrefix);

      expect(mockTypeOrmRepository.findOne!).toHaveBeenCalledTimes(1);
      expect(mockTypeOrmRepository.findOne!).toHaveBeenCalledWith({ where: { geohashPrefix } });
      expect(result).toEqual(mockResult);
    });

    it('should return null if findOne returns null', async () => {
      const geohashPrefix = 'dpz8xbc';
      mockTypeOrmRepository.findOne!.mockResolvedValue(null);

      const result = await repository.findLastScanned(geohashPrefix);

      expect(mockTypeOrmRepository.findOne!).toHaveBeenCalledTimes(1);
      expect(mockTypeOrmRepository.findOne!).toHaveBeenCalledWith({ where: { geohashPrefix } });
      expect(result).toBeNull();
    });
  });

  describe('upsertLastScanned', () => {
    it('should call create and save with correct data', async () => {
      const geohashPrefix = 'dpz8xbc';
      const scannedAt = new Date();
      const expectedData = { geohashPrefix, lastScannedAt: scannedAt };
      const mockEntity = { ...expectedData };
      const mockSavedEntity = { ...expectedData };
      
      mockTypeOrmRepository.create!.mockReturnValue(mockEntity);
      mockTypeOrmRepository.save!.mockResolvedValue(mockSavedEntity);

      const result = await repository.upsertLastScanned(geohashPrefix, scannedAt);

      expect(mockTypeOrmRepository.create!).toHaveBeenCalledTimes(1);
      expect(mockTypeOrmRepository.create!).toHaveBeenCalledWith(expectedData);
      expect(mockTypeOrmRepository.save!).toHaveBeenCalledTimes(1);
      expect(mockTypeOrmRepository.save!).toHaveBeenCalledWith(mockEntity);
      expect(result).toEqual(mockSavedEntity);
    });
  });

  // Optional test from repository code
  describe('findLastScannedOrThrow', () => {
    it('should return the entity if found', async () => {
      const geohashPrefix = 'dpz8xb1';
      const mockResult = createMockScannedArea({ geohashPrefix });
      mockTypeOrmRepository.findOne!.mockResolvedValue(mockResult);

      await expect(repository.findLastScannedOrThrow(geohashPrefix)).resolves.toEqual(mockResult);
      expect(mockTypeOrmRepository.findOne!).toHaveBeenCalledWith({ where: { geohashPrefix } });
    });

    it('should throw NotFoundException if not found', async () => {
      const geohashPrefix = 'dpz8xb2';
      mockTypeOrmRepository.findOne!.mockResolvedValue(null);

      await expect(repository.findLastScannedOrThrow(geohashPrefix)).rejects.toThrow(
        `Scanned area with prefix ${geohashPrefix} not found.`,
      );
      expect(mockTypeOrmRepository.findOne!).toHaveBeenCalledWith({ where: { geohashPrefix } });
    });
  });
}); 