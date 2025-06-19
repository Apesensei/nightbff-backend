import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserRepository } from "../../repositories/user.repository";
import { User } from "../../../auth/entities/user.entity";
import {
  UserRelationship,
  RelationshipType,
} from "../../entities/user-relationship.entity";
import { UserProfile } from "../../entities/user-profile.entity";
import {
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";

describe("UserRepository", () => {
  let userRepository: UserRepository;
  let typeOrmRepository: jest.Mocked<Repository<User>>;
  let relationshipRepository: jest.Mocked<Repository<UserRelationship>>;
  let userProfileRepositoryMock: jest.Mocked<Repository<UserProfile>>;

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    getRawAndEntities: jest.fn(),
    getCount: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const mockTypeOrmRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      existsBy: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
      query: jest.fn(),
      manager: {
        query: jest.fn(),
      },
    };
    const mockRelationshipRepository = { find: jest.fn() };
    const mockUserProfileRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: getRepositoryToken(User),
          useValue: mockTypeOrmRepository,
        },
        {
          provide: getRepositoryToken(UserRelationship),
          useValue: mockRelationshipRepository,
        },
        {
          provide: getRepositoryToken(UserProfile),
          useValue: mockUserProfileRepository,
        },
      ],
    }).compile();

    userRepository = module.get<UserRepository>(UserRepository);
    typeOrmRepository = module.get(getRepositoryToken(User));
    relationshipRepository = module.get(getRepositoryToken(UserRelationship));
    userProfileRepositoryMock = module.get(getRepositoryToken(UserProfile));
  });

  describe("findById", () => {
    it("should find a user by id", async () => {
      const mockUser = new User();
      mockUser.id = "test-id";
      mockUser.username = "testuser";

      typeOrmRepository.findOne.mockResolvedValue(mockUser);

      const result = await userRepository.findById("test-id");

      expect(result).toEqual(mockUser);
      expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
        where: { id: "test-id" },
      });
    });

    it("should return null if user not found", async () => {
      typeOrmRepository.findOne.mockResolvedValue(null);

      const result = await userRepository.findById("non-existent-id");

      expect(result).toBeNull();
    });

    it("should throw InternalServerErrorException on database error", async () => {
      typeOrmRepository.findOne.mockRejectedValue(new Error("DB error"));

      await expect(userRepository.findById("test-id")).rejects.toThrow();
    });
  });

  describe("findNearbyUsers", () => {
    it("should return users within specified radius", async () => {
      const mockUsers = [
        {
          id: "user-1",
          username: "user1",
          locationLatitude: 40.7,
          locationLongitude: -74.0,
        },
        {
          id: "user-2",
          username: "user2",
          locationLatitude: 40.8,
          locationLongitude: -74.1,
        },
      ];
      const mockRawData = [{ distance: 1000 }, { distance: 2000 }];

      mockQueryBuilder.getRawAndEntities.mockResolvedValue({
        entities: mockUsers,
        raw: mockRawData,
      });
      mockQueryBuilder.getCount.mockResolvedValue(mockUsers.length);
      (typeOrmRepository.manager.query as jest.Mock).mockResolvedValueOnce(mockUsers.map((u, i) => ({ ...u, distance_meters: mockRawData[i].distance })))
                                     .mockResolvedValueOnce([{ total: mockUsers.length }]);

      relationshipRepository.find.mockResolvedValue([]);

      const params = {
        latitude: 40.7128,
        longitude: -74.006,
        radiusInKm: 5,
        excludeUserIds: [],
        limit: 20,
        offset: 0,
      };
      const [users, count] = await userRepository.findNearbyUsers(
        params,
        "current-user-id",
      );

      expect(typeOrmRepository.manager.query).toHaveBeenCalled();
      expect(count).toBe(2);
      expect(users).toHaveLength(2);
      expect(users[0].distance).toBe(1.0);
      expect(users[1].distance).toBe(2.0);
    });

    it("should filter out blocked users", async () => {
      const blockedRelationship = new UserRelationship();
      blockedRelationship.requesterId = "current-user-id";
      blockedRelationship.recipientId = "blocked-user-id";
      blockedRelationship.type = RelationshipType.BLOCKED;

      mockQueryBuilder.getRawAndEntities.mockResolvedValue({
        entities: [],
        raw: [],
      });
      mockQueryBuilder.getCount.mockResolvedValue(0);
      (typeOrmRepository.manager.query as jest.Mock).mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0 }]);

      relationshipRepository.find.mockResolvedValue([blockedRelationship]);

      const params = {
        latitude: 40.7128,
        longitude: -74.006,
        radiusInKm: 5,
        excludeUserIds: [],
        limit: 20,
        offset: 0,
      };
      await userRepository.findNearbyUsers(params, "current-user-id");

      expect(typeOrmRepository.manager.query).toHaveBeenCalled();

      const queryArgs = (typeOrmRepository.manager.query as jest.Mock).mock
        .calls[0][1];
      expect(queryArgs).toContain("current-user-id");
      expect(queryArgs).toContain("blocked-user-id");
    });
  });

  describe("findActiveNearbyUsers", () => {
    it("should filter users by activity time", async () => {
      const mockUsers = [
        {
          id: "user-1",
          username: "user1",
          locationLatitude: 40.7,
          locationLongitude: -74.0,
        },
      ];
      const mockRawData = [{ distance: 1000 }];

      mockQueryBuilder.getRawAndEntities.mockResolvedValue({
        entities: mockUsers,
        raw: mockRawData,
      });
      mockQueryBuilder.getCount.mockResolvedValue(mockUsers.length);
      (typeOrmRepository.manager.query as jest.Mock).mockResolvedValueOnce(mockUsers.map((u, i) => ({ ...u, distance_meters: mockRawData[i].distance })))
                                     .mockResolvedValueOnce([{ total: mockUsers.length }]);

      relationshipRepository.find.mockResolvedValue([]);

      const params = {
        latitude: 40.7128,
        longitude: -74.006,
        radiusInKm: 5,
        excludeUserIds: [],
        limit: 20,
        offset: 0,
      };
      const [users, count] = await userRepository.findActiveNearbyUsers(
        params,
        "current-user-id",
        30,
      );

      expect(typeOrmRepository.manager.query).toHaveBeenCalled();
      expect(users).toHaveLength(1);
      expect(count).toBe(1);
    });
  });

  describe("updateUserLocation", () => {
    it("should update user location", async () => {
      const mockUser = new User();
      mockUser.id = "test-id";
      mockUser.username = "testuser";

      typeOrmRepository.findOne.mockResolvedValue(mockUser);
      typeOrmRepository.save.mockResolvedValue({
        ...mockUser,
        locationLatitude: 40.7128,
        locationLongitude: -74.006,
      } as User);

      const updatedUser = await userRepository.updateUserLocation(
        "test-id",
        40.7128,
        -74.006,
      );

      expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
        where: { id: "test-id" },
      });
      expect(typeOrmRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "test-id",
          locationLatitude: 40.7128,
          locationLongitude: -74.006,
        }),
      );
      expect(updatedUser.locationLatitude).toBe(40.7128);
      expect(updatedUser.locationLongitude).toBe(-74.006);
    });

    it("should throw NotFoundException if user not found", async () => {
      typeOrmRepository.findOne.mockResolvedValue(null);

      await expect(
        userRepository.updateUserLocation("non-existent-id", 40.7128, -74.006),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // New describe block for createUserProfile tests
  describe("createUserProfile", () => {
    it("should create a user profile successfully", async () => {
      const userId = "existing-user-id";
      const profileData = {
        country: "United States",
        // Add other fields from UserProfile if necessary for the test
      };
      const mockUserProfile = {
        id: "new-profile-id",
        userId: userId,
        ...profileData,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as UserProfile;

      // Mock dependencies
      typeOrmRepository.existsBy.mockResolvedValue(true); // Assume user exists
      userProfileRepositoryMock.create.mockReturnValue(mockUserProfile); // Mock create
      userProfileRepositoryMock.save.mockResolvedValue(mockUserProfile); // Mock save

      const result = await userRepository.createUserProfile(
        userId,
        profileData,
      );

      // Assertions
      expect(typeOrmRepository.existsBy).toHaveBeenCalledWith({ id: userId });
      expect(userProfileRepositoryMock.create).toHaveBeenCalledWith({
        userId,
        ...profileData,
      });
      expect(userProfileRepositoryMock.save).toHaveBeenCalledWith(
        mockUserProfile,
      );
      expect(result).toEqual(mockUserProfile);
    });

    it("should throw InternalServerErrorException if user does not exist", async () => {
      const userId = "non-existent-user-id";
      const profileData = { country: "Canada" };

      // Mock dependencies
      typeOrmRepository.existsBy.mockResolvedValue(false); // User does not exist

      // Assertions
      await expect(
        userRepository.createUserProfile(userId, profileData),
      ).rejects.toThrow(
        new InternalServerErrorException(
          `Error creating user profile: Cannot create profile for non-existent user ${userId}`,
        ),
      );
      expect(userProfileRepositoryMock.create).not.toHaveBeenCalled();
      expect(userProfileRepositoryMock.save).not.toHaveBeenCalled();
    });

    it("should throw InternalServerErrorException on database error during save", async () => {
      const userId = "existing-user-id";
      const profileData = { country: "Mexico" };
      const mockUserProfile = {
        id: "new-profile-id",
        userId: userId,
        ...profileData,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as UserProfile;

      // Mock dependencies
      typeOrmRepository.existsBy.mockResolvedValue(true); // Assume user exists
      userProfileRepositoryMock.create.mockReturnValue(mockUserProfile); // Mock create
      userProfileRepositoryMock.save.mockRejectedValue(
        new Error("DB save error"),
      ); // Mock save failure

      // Assertions
      await expect(
        userRepository.createUserProfile(userId, profileData),
      ).rejects.toThrow(
        new InternalServerErrorException(
          `Error creating user profile: DB save error`,
        ),
      );
      expect(userProfileRepositoryMock.create).toHaveBeenCalledWith({
        userId,
        ...profileData,
      });
      expect(userProfileRepositoryMock.save).toHaveBeenCalledWith(
        mockUserProfile,
      );
    });
  });
});
