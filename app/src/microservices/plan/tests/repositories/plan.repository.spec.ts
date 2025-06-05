import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  Repository,
  UpdateResult,
  DeleteResult,
  FindOneOptions,
} from "typeorm";
import { PlanRepository } from "../../repositories/plan.repository";
import { Plan } from "../../entities/plan.entity";
import { City } from "../../entities/city.entity";

// Mock TypeORM repository methods
const mockPlanOrmRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  increment: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

// Mock City object for relations
const mockCity: City = {
  id: "city-uuid",
  name: "Mock City Name",
  countryCode: "MC",
  location: "POINT(1 1)",
  flagEmoji: "🏁",
  trendingScore: 0,
  planCount: 0,
  imageUrl: undefined,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("PlanRepository", () => {
  let repository: PlanRepository;
  let ormRepository: Repository<Plan>;

  beforeEach(async () => {
    jest.clearAllMocks(); // Clear mocks before each test

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanRepository,
        {
          provide: getRepositoryToken(Plan),
          useValue: mockPlanOrmRepository,
        },
      ],
    }).compile();

    repository = module.get<PlanRepository>(PlanRepository);
    ormRepository = module.get<Repository<Plan>>(getRepositoryToken(Plan));
  });

  it("should be defined", () => {
    expect(repository).toBeDefined();
  });

  describe("create", () => {
    it("should create and save a plan", async () => {
      const planData: Partial<Plan> = {
        creatorId: "user-uuid",
        cityId: "city-uuid",
        startDate: new Date(),
      };
      const createdPlan = {
        ...planData,
        saveCount: 0,
        viewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        city: mockCity,
      } as Plan;
      const savedPlan = {
        ...createdPlan,
        id: "plan-uuid",
      } as Plan;

      mockPlanOrmRepository.create.mockReturnValue(createdPlan);
      mockPlanOrmRepository.save.mockResolvedValue(savedPlan);

      const result = await repository.create(planData);

      expect(mockPlanOrmRepository.create).toHaveBeenCalledWith(planData);
      expect(mockPlanOrmRepository.save).toHaveBeenCalledWith(createdPlan);
      expect(result).toEqual(savedPlan);
    });
  });

  describe("findOneById", () => {
    const planId = "plan-uuid";
    const mockPlan: Plan = {
      id: planId,
      creatorId: "user-uuid",
      cityId: "city-uuid",
      venueId: undefined,
      startDate: new Date(),
      endDate: undefined,
      coverImage: undefined,
      saveCount: 0,
      viewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      city: mockCity,
    };

    it("should find a plan by id", async () => {
      mockPlanOrmRepository.findOne.mockResolvedValue(mockPlan);

      const result = await repository.findOneById(planId);

      expect(mockPlanOrmRepository.findOne).toHaveBeenCalledWith({
        where: { id: planId },
      });
      expect(result).toEqual(mockPlan);
    });

    it("should find a plan by id with options", async () => {
      const options: FindOneOptions<Plan> = { relations: ["city"] };
      mockPlanOrmRepository.findOne.mockResolvedValue(mockPlan);

      const result = await repository.findOneById(planId, options);

      // Ensure options are merged correctly with the where clause
      expect(mockPlanOrmRepository.findOne).toHaveBeenCalledWith({
        relations: ["city"],
        where: { id: planId },
      });
      expect(result).toEqual(mockPlan);
    });

    it("should return null if plan not found", async () => {
      mockPlanOrmRepository.findOne.mockResolvedValue(null);

      const result = await repository.findOneById(planId);

      expect(mockPlanOrmRepository.findOne).toHaveBeenCalledWith({
        where: { id: planId },
      });
      expect(result).toBeNull();
    });
  });

  describe("findByCityId", () => {
    const cityId = "city-uuid";
    const mockPlanTemplate: Plan = {
      id: "plan1",
      creatorId: "user-uuid",
      cityId: cityId,
      venueId: undefined,
      startDate: new Date(),
      endDate: undefined,
      coverImage: undefined,
      saveCount: 0,
      viewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      city: mockCity,
    };
    const mockPlans = [
      { ...mockPlanTemplate, id: "plan1" },
      {
        ...mockPlanTemplate,
        id: "plan2",
        createdAt: new Date(Date.now() - 10000),
      },
    ];
    const mockCount = mockPlans.length;

    it("should find plans by city id with default pagination", async () => {
      mockPlanOrmRepository.findAndCount.mockResolvedValue([
        mockPlans,
        mockCount,
      ]);

      const result = await repository.findByCityId(cityId);

      expect(mockPlanOrmRepository.findAndCount).toHaveBeenCalledWith({
        where: { cityId },
        relations: ["city"],
        order: { createdAt: "DESC" },
        take: 10,
        skip: 0,
      });
      expect(result).toEqual([mockPlans, mockCount]);
    });

    it("should find plans by city id with custom pagination", async () => {
      const paginationOptions = { limit: 1, offset: 1 };
      const expectedResult = [mockPlans[1]];
      mockPlanOrmRepository.findAndCount.mockResolvedValue([
        expectedResult,
        mockCount,
      ]);

      const result = await repository.findByCityId(cityId, paginationOptions);

      expect(mockPlanOrmRepository.findAndCount).toHaveBeenCalledWith({
        where: { cityId },
        relations: ["city"],
        order: { createdAt: "DESC" },
        take: paginationOptions.limit,
        skip: paginationOptions.offset,
      });
      expect(result).toEqual([expectedResult, mockCount]);
    });
  });

  // describe('findSavedPlansByUser', () => {
  //     // Skipping tests until implementation is added
  //     it.skip('should return saved plans for a user', async () => {
  //         // Add tests when implemented
  //     });
  // });

  describe("incrementSaveCount", () => {
    const planId = "plan-uuid";
    const amount = 1;
    const updateResult: UpdateResult = {
      affected: 1,
      raw: {},
      generatedMaps: [],
    };

    it("should call increment for saveCount", async () => {
      mockPlanOrmRepository.increment.mockResolvedValue(updateResult);

      const result = await repository.incrementSaveCount(planId, amount);

      expect(mockPlanOrmRepository.increment).toHaveBeenCalledWith(
        { id: planId },
        "saveCount",
        amount,
      );
      expect(result).toEqual(updateResult);
    });
  });

  describe("incrementViewCount", () => {
    const planId = "plan-uuid";
    const amount = 1;
    const updateResult: UpdateResult = {
      affected: 1,
      raw: {},
      generatedMaps: [],
    };

    it("should call increment for viewCount", async () => {
      mockPlanOrmRepository.increment.mockResolvedValue(updateResult);
      const result = await repository.incrementViewCount(planId, amount);

      expect(mockPlanOrmRepository.increment).toHaveBeenCalledWith(
        { id: planId },
        "viewCount",
        amount,
      );
      expect(result).toEqual(updateResult);
    });
  });

  describe("update", () => {
    const planId = "plan-uuid";
    const updateData: Partial<Plan> = { coverImage: "new-image.jpg" };
    const updateResult: UpdateResult = {
      affected: 1,
      raw: {},
      generatedMaps: [],
    };

    it("should call update with correct parameters", async () => {
      mockPlanOrmRepository.update.mockResolvedValue(updateResult);

      const result = await repository.update(planId, updateData);

      expect(mockPlanOrmRepository.update).toHaveBeenCalledWith(
        { id: planId },
        updateData,
      );
      expect(result).toEqual(updateResult);
    });
  });

  describe("delete", () => {
    const planId = "plan-uuid";
    const deleteResult: DeleteResult = { affected: 1, raw: {} };

    it("should call delete with correct parameters", async () => {
      mockPlanOrmRepository.delete.mockResolvedValue(deleteResult);

      const result = await repository.delete(planId);

      expect(mockPlanOrmRepository.delete).toHaveBeenCalledWith({ id: planId });
      expect(result).toEqual(deleteResult);
    });
  });
});
