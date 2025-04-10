import { Test } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import {
  UserDiscoveryService,
  ViewerWithTimestamp,
} from "../../services/user-discovery.service";
import {
  UserRepository,
  UserWithDistance,
} from "../../repositories/user.repository";
import { UserRelationshipRepository } from "../../repositories/user-relationship.repository";
import { ProfileViewRepository } from "../../repositories/profile-view.repository";
import { RelationshipType } from "../../entities/user-relationship.entity";
import { User } from "../../../auth/entities/user.entity";
import { ProfileView } from "../../entities/profile-view.entity";

describe("UserDiscoveryService", () => {
  let userDiscoveryService: UserDiscoveryService;
  let userRepository: UserRepository;
  let userRelationshipRepository: UserRelationshipRepository;
  let profileViewRepository: ProfileViewRepository;

  const mockUserRepository = () => ({
    findById: jest.fn(),
    findNearbyUsers: jest.fn(),
    findActiveNearbyUsers: jest.fn(),
  });

  const mockUserRelationshipRepository = () => ({
    findUserRelationships: jest.fn(),
  });

  const mockProfileViewRepository = () => ({
    getViewsForUser: jest.fn(),
    countUniqueViewersForUser: jest.fn(),
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UserDiscoveryService,
        { provide: UserRepository, useFactory: mockUserRepository },
        {
          provide: UserRelationshipRepository,
          useFactory: mockUserRelationshipRepository,
        },
        {
          provide: ProfileViewRepository,
          useFactory: mockProfileViewRepository,
        },
      ],
    }).compile();

    userDiscoveryService =
      moduleRef.get<UserDiscoveryService>(UserDiscoveryService);
    userRepository = moduleRef.get<UserRepository>(UserRepository);
    userRelationshipRepository = moduleRef.get<UserRelationshipRepository>(
      UserRelationshipRepository,
    );
    profileViewRepository = moduleRef.get<ProfileViewRepository>(
      ProfileViewRepository,
    );
  });

  describe("findNearbyUsers", () => {
    it("should find nearby users", async () => {
      const mockUser1 = {
        id: "user-1",
        username: "user1",
        distance: 1.5,
      } as UserWithDistance;

      const mockUser2 = {
        id: "user-2",
        username: "user2",
        distance: 2.8,
      } as UserWithDistance;

      const mockUsers = [mockUser1, mockUser2];
      const mockTotal = mockUsers.length;

      jest
        .spyOn(userRelationshipRepository, "findUserRelationships")
        .mockResolvedValue([[], 0]);
      jest
        .spyOn(userRepository, "findNearbyUsers")
        .mockResolvedValue([mockUsers, mockTotal]);

      const result = await userDiscoveryService.findNearbyUsers(
        "current-user",
        40.7128,
        -74.006,
      );

      expect(result.users).toEqual(mockUsers);
      expect(result.total).toBe(mockTotal);
      expect(userRepository.findNearbyUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: 40.7128,
          longitude: -74.006,
          radiusInKm: 5, // Default value
        }),
        "current-user",
      );
    });

    it("should find active nearby users when activeOnly is true", async () => {
      const mockUsers = [
        {
          id: "user-1",
          username: "user1",
          distance: 1.5,
        } as UserWithDistance,
      ];
      const mockTotal = mockUsers.length;

      jest
        .spyOn(userRelationshipRepository, "findUserRelationships")
        .mockResolvedValue([[], 0]);
      jest
        .spyOn(userRepository, "findActiveNearbyUsers")
        .mockResolvedValue([mockUsers, mockTotal]);

      const result = await userDiscoveryService.findNearbyUsers(
        "current-user",
        40.7128,
        -74.006,
        {
          activeOnly: true,
          activeWithinMinutes: 15,
        },
      );

      expect(result.users).toEqual(mockUsers);
      expect(result.total).toBe(mockTotal);
      expect(userRepository.findActiveNearbyUsers).toHaveBeenCalledWith(
        expect.any(Object),
        "current-user",
        15,
      );
    });

    it("should throw BadRequestException for invalid coordinates", async () => {
      await expect(
        userDiscoveryService.findNearbyUsers("current-user", NaN, -74.006),
      ).rejects.toThrow(BadRequestException);

      await expect(
        userDiscoveryService.findNearbyUsers("current-user", 40.7128, NaN),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getRecommendedUsers", () => {
    it("should get recommended users based on location", async () => {
      const mockUser = new User();
      mockUser.id = "current-user";
      mockUser.locationLatitude = 40.7128;
      mockUser.locationLongitude = -74.006;

      const mockUsers = [
        {
          id: "user-1",
          username: "user1",
          distance: 1.5,
        } as UserWithDistance,
      ];
      const mockTotal = mockUsers.length;

      jest.spyOn(userRepository, "findById").mockResolvedValue(mockUser);
      jest
        .spyOn(userRelationshipRepository, "findUserRelationships")
        .mockResolvedValue([[], 0]);
      jest
        .spyOn(userRepository, "findNearbyUsers")
        .mockResolvedValue([mockUsers, mockTotal]);

      const result =
        await userDiscoveryService.getRecommendedUsers("current-user");

      expect(result.users).toEqual(mockUsers);
      expect(result.total).toBe(mockTotal);
      expect(userRepository.findNearbyUsers).toHaveBeenCalled();
    });

    it("should throw BadRequestException if user location not available", async () => {
      const mockUser = new User();
      mockUser.id = "current-user";
      // No location data

      jest.spyOn(userRepository, "findById").mockResolvedValue(mockUser);

      await expect(
        userDiscoveryService.getRecommendedUsers("current-user"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getProfileViewers", () => {
    it("should return users who viewed the profile", async () => {
      const mockViews = [
        {
          id: "view-1",
          viewerId: "viewer-1",
          viewedId: "current-user",
          createdAt: new Date(),
        } as ProfileView,
        {
          id: "view-2",
          viewerId: "viewer-2",
          viewedId: "current-user",
          createdAt: new Date(),
        } as ProfileView,
      ];

      const mockUsers = [
        {
          id: "viewer-1",
          username: "viewer1",
        } as User,
        {
          id: "viewer-2",
          username: "viewer2",
        } as User,
      ];

      jest
        .spyOn(profileViewRepository, "getViewsForUser")
        .mockResolvedValue([mockViews, mockViews.length]);
      jest
        .spyOn(profileViewRepository, "countUniqueViewersForUser")
        .mockResolvedValue(mockViews.length);

      // Mock user repository findById to return corresponding users
      jest.spyOn(userRepository, "findById").mockImplementation((id) => {
        if (id === "viewer-1") return Promise.resolve(mockUsers[0]);
        if (id === "viewer-2") return Promise.resolve(mockUsers[1]);
        return Promise.resolve(null);
      });

      const result =
        await userDiscoveryService.getProfileViewers("current-user");

      expect(result.users.length).toBe(2);
      expect(result.total).toBe(2);

      // Verify each user has viewedAt property from the view
      expect(result.users[0].viewedAt).toEqual(mockViews[0].createdAt);
      expect(result.users[1].viewedAt).toEqual(mockViews[1].createdAt);

      expect(profileViewRepository.getViewsForUser).toHaveBeenCalledWith(
        "current-user",
        expect.any(Number),
        expect.any(Number),
      );
    });

    it("should return empty array if no profile views", async () => {
      jest
        .spyOn(profileViewRepository, "getViewsForUser")
        .mockResolvedValue([[], 0]);

      const result =
        await userDiscoveryService.getProfileViewers("current-user");

      expect(result.users).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
