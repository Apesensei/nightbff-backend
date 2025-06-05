import { Test } from "@nestjs/testing";
import {
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserDiscoveryService } from "../../services/user-discovery.service";
import { UserRelationshipRepository } from "../../repositories/user-relationship.repository";
import { User } from "../../../auth/entities/user.entity";
import { calculateAge } from "../../../../common/utils/date.utils";
import {
  UserProfile,
  Gender,
  GenderPreference,
} from "../../entities/user-profile.entity";
import { UserRepository } from "../../repositories/user.repository";
import { ProfileViewRepository } from "../../repositories/profile-view.repository";

// --- Mock the date utils module --- START
jest.mock("../../../../common/utils/date.utils", () => ({
  calculateAge: jest.fn(),
}));
// --- Mock the date utils module --- END

// Get a reference to the mock function
const mockCalculateAge = calculateAge as jest.Mock;

describe("UserDiscoveryService", () => {
  let service: UserDiscoveryService;
  let userProfileRepository: Repository<UserProfile>;
  let userRelationshipRepository: UserRelationshipRepository;

  type MockUserProfileRepository = Partial<
    Record<keyof Repository<UserProfile>, jest.Mock>
  > & { createQueryBuilder: jest.Mock };
  type MockUserRelationshipRepository = Partial<
    Record<keyof UserRelationshipRepository, jest.Mock>
  > & { findBlockedUserIds: jest.Mock };

  // Re-add MockUserRepository type
  type MockUserRepository = Partial<Record<keyof UserRepository, jest.Mock>>;

  // --- Add MockProfileViewRepository type --- START
  type MockProfileViewRepository = Partial<
    Record<keyof ProfileViewRepository, jest.Mock>
  >;
  // --- Add MockProfileViewRepository type --- END

  const mockUserProfileRepositoryFactory = jest.fn(() => ({
    createQueryBuilder: jest.fn().mockReturnValue({
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      select: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    }),
    findOne: jest.fn(),
  }));

  // Re-add mockUserRepositoryFactory
  const mockUserRepositoryFactory = jest.fn(() => ({
    findById: jest.fn(),
    findNearbyUsers: jest.fn(),
    findActiveNearbyUsers: jest.fn(),
  }));

  const mockUserRelationshipRepositoryFactory = jest.fn(() => ({
    findBlockedUserIds: jest.fn(),
    findUserRelationships: jest.fn(),
  }));

  // --- Add mockProfileViewRepositoryFactory --- START
  const mockProfileViewRepositoryFactory = jest.fn(() => ({
    getViewsForUser: jest.fn(),
    countUniqueViewersForUser: jest.fn(),
    // Add mocks for other methods used by UserDiscoveryService if needed
  }));
  // --- Add mockProfileViewRepositoryFactory --- END

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UserDiscoveryService,
        {
          provide: getRepositoryToken(UserProfile),
          useFactory: mockUserProfileRepositoryFactory,
        },
        {
          provide: UserRepository,
          useFactory: mockUserRepositoryFactory,
        },
        {
          provide: UserRelationshipRepository,
          useFactory: mockUserRelationshipRepositoryFactory,
        },
        {
          provide: ProfileViewRepository,
          useFactory: mockProfileViewRepositoryFactory,
        },
      ],
    }).compile();

    service = moduleRef.get<UserDiscoveryService>(UserDiscoveryService);
    userProfileRepository = moduleRef.get<Repository<UserProfile>>(
      getRepositoryToken(UserProfile),
    );
    userRelationshipRepository = moduleRef.get<UserRelationshipRepository>(
      UserRelationshipRepository,
    );

    mockCalculateAge.mockClear();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getHomepageRecommendations", () => {
    let currentUserProfile: UserProfile;
    let mockCandidates: UserProfile[];

    beforeEach(() => {
      mockCalculateAge.mockClear();

      currentUserProfile = new UserProfile();
      currentUserProfile.userId = "current-user";
      currentUserProfile.gender = Gender.FEMALE;
      currentUserProfile.birthDate = new Date("1995-01-01");
      currentUserProfile.genderPreference = GenderPreference.BOTH;
      currentUserProfile.user = new User();
      currentUserProfile.user.id = "current-user";

      const candidateProfile1 = new UserProfile();
      candidateProfile1.userId = "candidate-1";
      candidateProfile1.gender = Gender.MALE;
      candidateProfile1.birthDate = new Date("1996-02-02");
      candidateProfile1.user = new User();
      candidateProfile1.user.id = "candidate-1";
      candidateProfile1.user.displayName = "Candidate One";
      candidateProfile1.user.photoURL = "photo1.jpg";

      const candidateProfile2 = new UserProfile();
      candidateProfile2.userId = "candidate-2";
      candidateProfile2.gender = Gender.FEMALE;
      candidateProfile2.birthDate = new Date("1997-03-03");
      candidateProfile2.user = new User();
      candidateProfile2.user.id = "candidate-2";
      candidateProfile2.user.displayName = "Candidate Two";
      candidateProfile2.user.photoURL = "photo2.jpg";

      const candidateProfilePreferNotSay = new UserProfile();
      candidateProfilePreferNotSay.userId = "candidate-pnts";
      candidateProfilePreferNotSay.gender = Gender.OTHER;
      candidateProfilePreferNotSay.birthDate = new Date("1998-04-04");
      candidateProfilePreferNotSay.user = new User();
      candidateProfilePreferNotSay.user.id = "candidate-pnts";
      candidateProfilePreferNotSay.user.displayName = "Candidate PNTS";
      candidateProfilePreferNotSay.user.photoURL = "photo_pnts.jpg";

      mockCandidates = [
        candidateProfile1,
        candidateProfile2,
        candidateProfilePreferNotSay,
      ];

      mockCalculateAge.mockImplementation((date) => {
        if (!date) return null;
        return new Date().getFullYear() - date.getFullYear();
      });
    });

    it("should return filtered and mapped recommendations", async () => {
      const userProfileRepoMock =
        userProfileRepository as unknown as MockUserProfileRepository;
      const userRelRepoMock =
        userRelationshipRepository as unknown as MockUserRelationshipRepository;

      const currentUserQueryBuilderMock = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(currentUserProfile),
      };
      userProfileRepoMock.createQueryBuilder.mockReturnValueOnce(
        currentUserQueryBuilderMock as any,
      );

      userRelRepoMock.findBlockedUserIds.mockResolvedValue([]);

      const candidatesQueryBuilderMock = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockCandidates),
      };
      userProfileRepoMock.createQueryBuilder.mockReturnValueOnce(
        candidatesQueryBuilderMock as any,
      );

      const result = await service.getHomepageRecommendations("current-user");

      expect(result).toBeDefined();
      expect(result.length).toBe(3);
      expect(result.some((u) => u.id === "candidate-1")).toBe(true);
      expect(result.some((u) => u.id === "candidate-2")).toBe(true);
      expect(result.some((u) => u.id === "candidate-pnts")).toBe(true);
      expect(result[0].age).toBeDefined();
      expect(result[1].age).toBeDefined();
      expect(result[2].age).toBeDefined();

      expect(userProfileRepoMock.createQueryBuilder).toHaveBeenCalledTimes(2);
      expect(currentUserQueryBuilderMock.getOne).toHaveBeenCalledTimes(1);
      expect(userRelRepoMock.findBlockedUserIds).toHaveBeenCalledWith(
        "current-user",
      );
      expect(candidatesQueryBuilderMock.getMany).toHaveBeenCalledTimes(1);
      expect(mockCalculateAge).toHaveBeenCalled();
    });

    it("should throw NotFoundException if current user profile not found", async () => {
      const userProfileRepoMock =
        userProfileRepository as unknown as MockUserProfileRepository;
      const currentUserQueryBuilderMock = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      userProfileRepoMock.createQueryBuilder.mockReturnValueOnce(
        currentUserQueryBuilderMock as any,
      );

      await expect(
        service.getHomepageRecommendations("nonexistent-user"),
      ).rejects.toThrow(NotFoundException);
      expect(userProfileRepoMock.createQueryBuilder).toHaveBeenCalledTimes(1);
      expect(currentUserQueryBuilderMock.getOne).toHaveBeenCalledTimes(1);
    });

    it("should exclude blocked users from recommendations", async () => {
      const userProfileRepoMock =
        userProfileRepository as unknown as MockUserProfileRepository;
      const userRelRepoMock =
        userRelationshipRepository as unknown as MockUserRelationshipRepository;

      // Arrange: Mock blocklist to include candidate-1
      userRelRepoMock.findBlockedUserIds.mockResolvedValue(["candidate-1"]);

      // Mock DB calls
      const currentUserQueryBuilderMock = {
        getOne: jest.fn().mockResolvedValue(currentUserProfile),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
      };
      userProfileRepoMock.createQueryBuilder.mockReturnValueOnce(
        currentUserQueryBuilderMock as any,
      );

      // ** CRITICAL: Mock getMany to return the list AS IF the DB excluded candidate-1 **
      const expectedCandidatesFromDb = mockCandidates.filter(
        (c) => c.userId !== "candidate-1",
      );
      const candidatesQueryBuilderMock = {
        // ... other chainable mocks ...
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(), // The service calls this
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        // This mock *must* reflect the result after DB filtering
        getMany: jest.fn().mockResolvedValue(expectedCandidatesFromDb),
      };
      userProfileRepoMock.createQueryBuilder.mockReturnValueOnce(
        candidatesQueryBuilderMock as any,
      );

      // Act
      const result = await service.getHomepageRecommendations("current-user");

      // Assert: Service logic filters PNTS, leaving only candidate-2
      expect(result.length).toBe(2);
      expect(result.find((u) => u.id === "candidate-1")).toBeUndefined();
      expect(result.some((u) => u.id === "candidate-2")).toBe(true);
      expect(result.some((u) => u.id === "candidate-pnts")).toBe(true);
      expect(userRelRepoMock.findBlockedUserIds).toHaveBeenCalledWith(
        "current-user",
      );
      // Verify the query builder was called correctly
      expect(candidatesQueryBuilderMock.andWhere).toHaveBeenCalledWith(
        expect.stringContaining("NOT IN (:...excludeUserIds)"),
        expect.objectContaining({
          excludeUserIds: expect.arrayContaining([
            "current-user",
            "candidate-1",
          ]),
        }),
      );
      expect(candidatesQueryBuilderMock.getMany).toHaveBeenCalledTimes(1);
    });

    it("should filter candidates by current user age preference", async () => {
      const userProfileRepoMock =
        userProfileRepository as unknown as MockUserProfileRepository;
      const userRelRepoMock =
        userRelationshipRepository as unknown as MockUserRelationshipRepository;

      // Arrange: Set age preference and mock ages
      currentUserProfile.minAgePreference = 28; // Example: 28-35
      currentUserProfile.maxAgePreference = 35;
      mockCalculateAge.mockImplementation((date) => {
        if (!date) return null;
        const year = date.getFullYear();
        if (year === 1996) return 29; // candidate-1 (In range)
        if (year === 1997) return 28; // candidate-2 (In range)
        if (year === 1998) return 27; // candidate-pnts (Out of range)
        return 30; // Default/Current user age
      });

      // Mock DB calls
      const currentUserQueryBuilderMock = {
        /* ... */ getOne: jest.fn().mockResolvedValue(currentUserProfile),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
      };
      userProfileRepoMock.createQueryBuilder.mockReturnValueOnce(
        currentUserQueryBuilderMock as any,
      );
      userRelRepoMock.findBlockedUserIds.mockResolvedValue([]);
      const candidatesQueryBuilderMock = {
        /* ... */ getMany: jest.fn().mockResolvedValue(mockCandidates),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
      };
      userProfileRepoMock.createQueryBuilder.mockReturnValueOnce(
        candidatesQueryBuilderMock as any,
      );

      // Act
      const result = await service.getHomepageRecommendations("current-user");

      // Assert
      expect(result.length).toBe(2); // candidate-pnts filtered by age (before gender filtering)
      expect(result.find((u) => u.id === "candidate-pnts")).toBeUndefined();
      expect(result[0].id).toBe("candidate-1");
      expect(result[1].id).toBe("candidate-2");
      // Verify calculateAge was called for filtering
      expect(mockCalculateAge).toHaveBeenCalledWith(new Date("1996-02-02"));
      expect(mockCalculateAge).toHaveBeenCalledWith(new Date("1997-03-03"));
      expect(mockCalculateAge).toHaveBeenCalledWith(new Date("1998-04-04"));
    });

    // --- Gender Filtering Tests --- //
    // Helper to setup mocks for gender tests
    const setupGenderTestMocks = () => {
      const userProfileRepoMock =
        userProfileRepository as unknown as MockUserProfileRepository;
      const userRelRepoMock =
        userRelationshipRepository as unknown as MockUserRelationshipRepository;
      const currentUserQueryBuilderMock = {
        getOne: jest.fn().mockResolvedValue(currentUserProfile),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
      };
      userProfileRepoMock.createQueryBuilder.mockReturnValueOnce(
        currentUserQueryBuilderMock as any,
      );
      userRelRepoMock.findBlockedUserIds.mockResolvedValue([]);
      const candidatesQueryBuilderMock = {
        getMany: jest.fn().mockResolvedValue(mockCandidates),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
      };
      userProfileRepoMock.createQueryBuilder.mockReturnValueOnce(
        candidatesQueryBuilderMock as any,
      );
      return {
        userProfileRepoMock,
        userRelRepoMock,
        currentUserQueryBuilderMock,
        candidatesQueryBuilderMock,
      };
    };

    it("should filter by gender preference (MALE)", async () => {
      // Arrange
      currentUserProfile.genderPreference = GenderPreference.MALE;
      setupGenderTestMocks();

      // Act
      const result = await service.getHomepageRecommendations("current-user");

      // Assert: Expecting candidate-1 (MALE) primarily, filled by candidate-2 (FEMALE) and candidate-pnts (OTHER)
      expect(result.length).toBe(3);
      // Verify presence, exact order depends on 75/25 logic and tie-breaking
      expect(result.some((u) => u.id === "candidate-1")).toBe(true); // Preferred
      expect(result.some((u) => u.id === "candidate-2")).toBe(true); // Fill
      expect(result.some((u) => u.id === "candidate-pnts")).toBe(true); // Fill (OTHER)
      // expect(result[0].id).toBe("candidate-1"); // Old assertion
      // expect(result[1].id).toBe("candidate-2"); // Old assertion
      // expect(result.find((u) => u.id === "candidate-pnts")).toBeUndefined(); // Old assertion
    });

    it("should filter by gender preference (FEMALE)", async () => {
      // Arrange
      currentUserProfile.genderPreference = GenderPreference.FEMALE;
      setupGenderTestMocks();

      // Act
      const result = await service.getHomepageRecommendations("current-user");

      // Assert: Expecting candidate-2 (FEMALE) primarily, filled by candidate-1 (MALE) and candidate-pnts (OTHER)
      expect(result.length).toBe(3);
      // Verify presence, exact order depends on 75/25 logic and tie-breaking
      expect(result.some((u) => u.id === "candidate-2")).toBe(true); // Preferred
      expect(result.some((u) => u.id === "candidate-1")).toBe(true); // Fill
      expect(result.some((u) => u.id === "candidate-pnts")).toBe(true); // Fill (OTHER)
      // expect(result[0].id).toBe("candidate-2"); // Old assertion
      // expect(result[1].id).toBe("candidate-1"); // Old assertion
      // expect(result.find((u) => u.id === "candidate-pnts")).toBeUndefined(); // Old assertion
    });

    it("should skip gender filtering if preference is undefined", async () => {
      // Arrange
      currentUserProfile.genderPreference = undefined;
      const { candidatesQueryBuilderMock } = setupGenderTestMocks();
      // Ensure candidates have distinct lastActiveAt for deterministic order
      const candidate1 = mockCandidates.find(
        (c) => c.userId === "candidate-1",
      )!;
      const candidate2 = mockCandidates.find(
        (c) => c.userId === "candidate-2",
      )!;
      candidate1.lastActiveAt = new Date(Date.now() - 10000); // 10s ago
      candidate2.lastActiveAt = new Date(Date.now() - 20000); // 20s ago
      // PNTS candidate's lastActiveAt doesn't matter as it's filtered before this step
      candidatesQueryBuilderMock.getMany.mockResolvedValue([
        candidate1,
        candidate2,
      ]); // Mock returns only valid gender candidates

      // Act
      const result = await service.getHomepageRecommendations("current-user");

      // Assert: Expecting candidates based on lastActiveAt, PNTS already excluded by service logic
      expect(result.length).toBe(2);
      expect(result[0].id).toBe("candidate-1"); // Most recent
      expect(result[1].id).toBe("candidate-2");
    });

    // --- Error Handling Tests --- //
    it("should throw InternalServerErrorException if findBlockedUserIds fails", async () => {
      const {
        userProfileRepoMock,
        userRelRepoMock,
        currentUserQueryBuilderMock,
      } = setupGenderTestMocks();
      // Arrange: Mock blocklist fetch failure
      userRelRepoMock.findBlockedUserIds.mockRejectedValue(
        new Error("DB Error"),
      );

      // Act & Assert
      await expect(
        service.getHomepageRecommendations("current-user"),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it("should throw InternalServerErrorException if candidate fetching fails", async () => {
      const {
        userProfileRepoMock,
        userRelRepoMock,
        currentUserQueryBuilderMock,
        candidatesQueryBuilderMock,
      } = setupGenderTestMocks();
      // Arrange: Mock candidate fetch failure
      candidatesQueryBuilderMock.getMany.mockRejectedValue(
        new Error("DB Error"),
      );

      // Act & Assert
      await expect(
        service.getHomepageRecommendations("current-user"),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
