import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  UserRepository,
  UserWithDistance,
} from "../../repositories/user.repository";
import { User } from "../../../auth/entities/user.entity";
import {
  UserRelationship,
  RelationshipType,
} from "../../entities/user-relationship.entity";

describe("UserRepository", () => {
  let userRepository: UserRepository;
  let typeOrmRepository: Repository<User>;
  let relationshipRepository: Repository<UserRelationship>;

  const mockUserRepository = () => ({
    createQueryBuilder: jest.fn(() => ({
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
    })),
    findOne: jest.fn(),
    save: jest.fn(),
  });

  const mockRelationshipRepository = () => ({
    find: jest.fn(),
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: getRepositoryToken(User),
          useFactory: mockUserRepository,
        },
        {
          provide: getRepositoryToken(UserRelationship),
          useFactory: mockRelationshipRepository,
        },
      ],
    }).compile();

    userRepository = moduleRef.get<UserRepository>(UserRepository);
    typeOrmRepository = moduleRef.get<Repository<User>>(
      getRepositoryToken(User),
    );
    relationshipRepository = moduleRef.get<Repository<UserRelationship>>(
      getRepositoryToken(UserRelationship),
    );
  });

  describe("findById", () => {
    it("should find a user by id", async () => {
      const mockUser = new User();
      mockUser.id = "test-id";
      mockUser.username = "testuser";

      jest.spyOn(typeOrmRepository, "findOne").mockResolvedValue(mockUser);

      const result = await userRepository.findById("test-id");

      expect(result).toEqual(mockUser);
      expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
        where: { id: "test-id" },
      });
    });

    it("should return null if user not found", async () => {
      jest.spyOn(typeOrmRepository, "findOne").mockResolvedValue(null);

      const result = await userRepository.findById("non-existent-id");

      expect(result).toBeNull();
    });

    it("should throw InternalServerErrorException on database error", async () => {
      jest
        .spyOn(typeOrmRepository, "findOne")
        .mockRejectedValue(new Error("DB error"));

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

      const mockRawData = [
        { distance: 1000 }, // 1 km
        { distance: 2000 }, // 2 km
      ];

      const queryBuilderMock = typeOrmRepository.createQueryBuilder() as any;
      queryBuilderMock.getRawAndEntities.mockResolvedValue({
        entities: mockUsers,
        raw: mockRawData,
      });
      queryBuilderMock.getCount.mockResolvedValue(mockUsers.length);

      jest.spyOn(relationshipRepository, "find").mockResolvedValue([]);

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

      expect(count).toBe(2);
      expect(users).toHaveLength(2);
      expect(users[0].distance).toBe(1.0); // 1000m -> 1.0km
      expect(users[1].distance).toBe(2.0); // 2000m -> 2.0km
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        expect.stringContaining("ST_Distance_Sphere"),
        expect.objectContaining({ radius: 5000 }), // 5km -> 5000m
      );
    });

    it("should filter out blocked users", async () => {
      const blockedRelationship = new UserRelationship();
      blockedRelationship.requesterId = "current-user-id";
      blockedRelationship.recipientId = "blocked-user-id";
      blockedRelationship.type = RelationshipType.BLOCKED;

      jest
        .spyOn(relationshipRepository, "find")
        .mockResolvedValue([blockedRelationship]);

      const queryBuilderMock = typeOrmRepository.createQueryBuilder() as any;
      queryBuilderMock.getRawAndEntities.mockResolvedValue({
        entities: [],
        raw: [],
      });
      queryBuilderMock.getCount.mockResolvedValue(0);

      const params = {
        latitude: 40.7128,
        longitude: -74.006,
        radiusInKm: 5,
        excludeUserIds: [],
        limit: 20,
        offset: 0,
      };

      await userRepository.findNearbyUsers(params, "current-user-id");

      // Verify that blocked-user-id is in the excludedIds
      expect(queryBuilderMock.where).toHaveBeenCalledWith(
        "user.id NOT IN (:...excludedIds)",
        expect.objectContaining({
          excludedIds: expect.arrayContaining([
            "blocked-user-id",
            "current-user-id",
          ]),
        }),
      );
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

      const mockRawData = [
        { distance: 1000 }, // 1 km
      ];

      const queryBuilderMock = typeOrmRepository.createQueryBuilder() as any;
      queryBuilderMock.getRawAndEntities.mockResolvedValue({
        entities: mockUsers,
        raw: mockRawData,
      });
      queryBuilderMock.getCount.mockResolvedValue(mockUsers.length);

      jest.spyOn(relationshipRepository, "find").mockResolvedValue([]);

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
        30, // active within 30 minutes
      );

      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        "user.last_active >= :activeAfter",
        expect.objectContaining({ activeAfter: expect.any(Date) }),
      );

      expect(users).toHaveLength(1);
      expect(count).toBe(1);
    });
  });

  describe("updateUserLocation", () => {
    it("should update user location", async () => {
      const mockUser = new User();
      mockUser.id = "test-id";
      mockUser.username = "testuser";

      jest.spyOn(userRepository, "findById").mockResolvedValue(mockUser);
      jest.spyOn(typeOrmRepository, "save").mockResolvedValue({
        ...mockUser,
        locationLatitude: 40.7128,
        locationLongitude: -74.006,
      } as User);

      const updatedUser = await userRepository.updateUserLocation(
        "test-id",
        40.7128,
        -74.006,
      );

      expect(updatedUser.locationLatitude).toBe(40.7128);
      expect(updatedUser.locationLongitude).toBe(-74.006);
      expect(typeOrmRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "test-id",
          locationLatitude: 40.7128,
          locationLongitude: -74.006,
        }),
      );
    });

    it("should throw NotFoundException if user not found", async () => {
      jest.spyOn(userRepository, "findById").mockResolvedValue(null);

      await expect(
        userRepository.updateUserLocation("non-existent-id", 40.7128, -74.006),
      ).rejects.toThrow();
    });
  });
});
