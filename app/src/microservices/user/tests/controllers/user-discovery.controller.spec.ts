import { Test } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { UserDiscoveryController } from "../../controllers/user-discovery.controller";
import {
  UserDiscoveryService,
  ViewerWithTimestamp,
} from "../../services/user-discovery.service";
import { UserWithDistance } from "../../repositories/user.repository";
import { User } from "../../../auth/entities/user.entity";

describe("UserDiscoveryController", () => {
  let userDiscoveryController: UserDiscoveryController;
  let userDiscoveryService: UserDiscoveryService;

  const mockUserDiscoveryService = () => ({
    findNearbyUsers: jest.fn(),
    getRecommendedUsers: jest.fn(),
    getProfileViewers: jest.fn(),
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UserDiscoveryController],
      providers: [
        {
          provide: UserDiscoveryService,
          useFactory: mockUserDiscoveryService,
        },
      ],
    }).compile();

    userDiscoveryController = moduleRef.get<UserDiscoveryController>(
      UserDiscoveryController,
    );
    userDiscoveryService =
      moduleRef.get<UserDiscoveryService>(UserDiscoveryService);
  });

  describe("findNearbyUsers", () => {
    it("should return nearby users", async () => {
      const mockUser = new User();
      mockUser.id = "current-user";

      const mockUsers = [
        {
          id: "user-1",
          username: "user1",
          distance: 1.5,
        } as UserWithDistance,
        {
          id: "user-2",
          username: "user2",
          distance: 2.8,
        } as UserWithDistance,
      ];

      const mockResponse = {
        users: mockUsers,
        total: mockUsers.length,
      };

      jest
        .spyOn(userDiscoveryService, "findNearbyUsers")
        .mockResolvedValue(mockResponse);

      const result = await userDiscoveryController.findNearbyUsers(
        mockUser,
        40.7128,
        -74.006,
        5,
        20,
        0,
        false,
        30,
      );

      expect(result).toEqual(mockResponse);
      expect(userDiscoveryService.findNearbyUsers).toHaveBeenCalledWith(
        "current-user",
        40.7128,
        -74.006,
        {
          radiusInKm: 5,
          limit: 20,
          offset: 0,
          activeOnly: false,
          activeWithinMinutes: 30,
        },
      );
    });

    it("should handle error from service", async () => {
      const mockUser = new User();
      mockUser.id = "current-user";

      jest
        .spyOn(userDiscoveryService, "findNearbyUsers")
        .mockRejectedValue(new BadRequestException("Invalid coordinates"));

      await expect(
        userDiscoveryController.findNearbyUsers(
          mockUser,
          NaN,
          -74.006,
          5,
          20,
          0,
          false,
          30,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getRecommendedUsers", () => {
    it("should return recommended users", async () => {
      const mockUser = new User();
      mockUser.id = "current-user";

      const mockUsers = [
        {
          id: "user-1",
          username: "user1",
          distance: 1.5,
        } as UserWithDistance,
      ];

      const mockResponse = {
        users: mockUsers,
        total: mockUsers.length,
      };

      jest
        .spyOn(userDiscoveryService, "getRecommendedUsers")
        .mockResolvedValue(mockResponse);

      const result = await userDiscoveryController.getRecommendedUsers(
        mockUser,
        20,
        0,
      );

      expect(result).toEqual(mockResponse);
      expect(userDiscoveryService.getRecommendedUsers).toHaveBeenCalledWith(
        "current-user",
        {
          limit: 20,
          offset: 0,
        },
      );
    });

    it("should handle error from service", async () => {
      const mockUser = new User();
      mockUser.id = "current-user";

      jest
        .spyOn(userDiscoveryService, "getRecommendedUsers")
        .mockRejectedValue(
          new BadRequestException("User location not available"),
        );

      await expect(
        userDiscoveryController.getRecommendedUsers(mockUser, 20, 0),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getProfileViewers", () => {
    it("should return profile viewers", async () => {
      const mockUser = new User();
      mockUser.id = "current-user";

      const mockViewers = [
        {
          id: "viewer-1",
          username: "viewer1",
          viewedAt: new Date(),
          distance: 0,
        } as ViewerWithTimestamp,
      ];

      const mockResponse = {
        users: mockViewers,
        total: mockViewers.length,
      };

      jest
        .spyOn(userDiscoveryService, "getProfileViewers")
        .mockResolvedValue(mockResponse);

      const result = await userDiscoveryController.getProfileViewers(
        mockUser,
        20,
        0,
      );

      expect(result).toEqual(mockResponse);
      expect(userDiscoveryService.getProfileViewers).toHaveBeenCalledWith(
        "current-user",
        {
          limit: 20,
          offset: 0,
        },
      );
    });

    it("should handle error from service", async () => {
      const mockUser = new User();
      mockUser.id = "current-user";

      jest
        .spyOn(userDiscoveryService, "getProfileViewers")
        .mockRejectedValue(new Error("Database error"));

      await expect(
        userDiscoveryController.getProfileViewers(mockUser, 20, 0),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
