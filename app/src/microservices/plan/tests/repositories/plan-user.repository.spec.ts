import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository, DeleteResult } from "typeorm";
import { PlanUserRepository } from "../../repositories/plan-user.repository";
import { PlanUser } from "../../entities/plan-user.entity";
import { Logger } from "@nestjs/common";
import { Plan } from "../../entities/plan.entity";
import { City } from "../../entities/city.entity";

// Mock TypeORM Repository for PlanUser
const mockPlanUserOrmRepository = {
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  find: jest.fn(),
  countBy: jest.fn(),
};

// Define Mock Logger Instance (needed again)
const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

// Mock City object for nested Plan relation
const mockCityForPlan: City = {
  id: "nested-city-uuid",
  name: "Nested Mock City",
  countryCode: "NC",
  location: "POINT(2 2)",
  flagEmoji: "🇳🇨",
  trendingScore: 1,
  planCount: 1,
  imageUrl: undefined,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock Plan object for PlanUser relation
const mockPlanForPlanUser: Plan = {
  id: "plan-uuid", // Match planId used in tests
  creatorId: "creator-uuid",
  cityId: "nested-city-uuid",
  startDate: new Date(),
  saveCount: 1,
  viewCount: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  city: mockCityForPlan,
  // Optional fields can be undefined or omitted if Partial used carefully
  venueId: undefined,
  endDate: undefined,
  coverImage: undefined,
};

describe("PlanUserRepository", () => {
  let repository: PlanUserRepository;
  let ormRepository: Repository<PlanUser>;

  const planId = "plan-uuid";
  const userId = "user-uuid";
  const mockPlanUser: PlanUser = {
    id: "plan-user-uuid",
    planId: planId,
    userId: userId,
    createdAt: new Date(),
    plan: mockPlanForPlanUser,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanUserRepository,
        {
          provide: getRepositoryToken(PlanUser),
          useValue: mockPlanUserOrmRepository,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    repository = module.get<PlanUserRepository>(PlanUserRepository);
    ormRepository = module.get<Repository<PlanUser>>(
      getRepositoryToken(PlanUser),
    );
  });

  it("should be defined", () => {
    expect(repository).toBeDefined();
  });

  describe("savePlan", () => {
    it("should return existing record if user already saved the plan", async () => {
      mockPlanUserOrmRepository.findOneBy.mockResolvedValue(mockPlanUser);

      const result = await repository.savePlan(planId, userId);

      expect(mockPlanUserOrmRepository.findOneBy).toHaveBeenCalledWith({
        planId,
        userId,
      });
      expect(mockPlanUserOrmRepository.create).not.toHaveBeenCalled();
      expect(mockPlanUserOrmRepository.save).not.toHaveBeenCalled();
      expect(result).toEqual(mockPlanUser);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("already saved plan"),
      );
    });

    it("should create and save a new record if not already saved", async () => {
      const createdRelation = { planId, userId };
      const savedRelation = { ...mockPlanUser };

      mockPlanUserOrmRepository.findOneBy.mockResolvedValue(null);
      mockPlanUserOrmRepository.create.mockReturnValue(createdRelation);
      mockPlanUserOrmRepository.save.mockResolvedValue(savedRelation);

      const result = await repository.savePlan(planId, userId);

      expect(mockPlanUserOrmRepository.findOneBy).toHaveBeenCalledWith({
        planId,
        userId,
      });
      expect(mockPlanUserOrmRepository.create).toHaveBeenCalledWith({
        planId,
        userId,
      });
      expect(mockPlanUserOrmRepository.save).toHaveBeenCalledWith(
        createdRelation,
      );
      expect(result).toEqual(savedRelation);
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("successfully saved plan"),
      );
    });

    it("should handle unique constraint error (23505) by re-fetching", async () => {
      const uniqueConstraintError = new Error("Unique constraint violation");
      (uniqueConstraintError as any).code = "23505";
      const existingRecordAfterError = { ...mockPlanUser };

      mockPlanUserOrmRepository.findOneBy.mockResolvedValueOnce(null);
      mockPlanUserOrmRepository.create.mockReturnValue({ planId, userId });
      mockPlanUserOrmRepository.save.mockRejectedValue(uniqueConstraintError);
      mockPlanUserOrmRepository.findOneBy.mockResolvedValueOnce(
        existingRecordAfterError,
      );

      const result = await repository.savePlan(planId, userId);

      expect(mockPlanUserOrmRepository.findOneBy).toHaveBeenCalledTimes(2);
      expect(mockPlanUserOrmRepository.create).toHaveBeenCalledWith({
        planId,
        userId,
      });
      expect(mockPlanUserOrmRepository.save).toHaveBeenCalled();
      expect(result).toEqual(existingRecordAfterError);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Race condition likely"),
      );
    });

    it("should re-throw other database errors during save", async () => {
      const dbError = new Error("Generic DB Error");
      mockPlanUserOrmRepository.findOneBy.mockResolvedValue(null);
      mockPlanUserOrmRepository.create.mockReturnValue({ planId, userId });
      mockPlanUserOrmRepository.save.mockRejectedValue(dbError);

      await expect(repository.savePlan(planId, userId)).rejects.toThrow(
        dbError,
      );

      expect(mockPlanUserOrmRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(mockPlanUserOrmRepository.create).toHaveBeenCalledWith({
        planId,
        userId,
      });
      expect(mockPlanUserOrmRepository.save).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to save plan"),
        expect.any(String),
      );
    });
  });

  describe("unsavePlan", () => {
    it("should delete the record if it exists", async () => {
      const deleteResult: DeleteResult = { affected: 1, raw: {} };
      mockPlanUserOrmRepository.delete.mockResolvedValue(deleteResult);

      const result = await repository.unsavePlan(planId, userId);

      expect(mockPlanUserOrmRepository.delete).toHaveBeenCalledWith({
        planId,
        userId,
      });
      expect(result).toEqual(deleteResult);
      expect(result.affected).toBe(1);
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it("should return result with affected 0 and log warning if record does not exist", async () => {
      const deleteResult: DeleteResult = { affected: 0, raw: {} };
      mockPlanUserOrmRepository.delete.mockResolvedValue(deleteResult);

      const result = await repository.unsavePlan(planId, userId);

      expect(mockPlanUserOrmRepository.delete).toHaveBeenCalledWith({
        planId,
        userId,
      });
      expect(result).toEqual(deleteResult);
      expect(result.affected).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("no existing save record found"),
      );
    });
  });

  // Add tests for findSavedPlansByUser and hasUserSavedPlan if needed
  // describe('findSavedPlansByUser', ...)
  // describe('hasUserSavedPlan', ...)
});
