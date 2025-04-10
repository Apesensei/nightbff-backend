import { Test, TestingModule } from "@nestjs/testing";
import { UserRelationshipController } from "../../controllers/user-relationship.controller";
import { UserRelationshipService } from "../../services/user-relationship.service";
import { BadRequestException } from "@nestjs/common";
import { RelationshipType } from "../../entities/user-relationship.entity";
import { ConnectionResponseStatus } from "../../dto/connection-response.dto";
import { User, UserStatus, UserRole } from "../../../auth/entities/user.entity"; // Corrected relative path
import {
  AgeVerification,
  AgeVerificationStatus,
} from "../../../auth/entities/age-verification.entity"; // Import entity and enum

// Create mock of CurrentUser decorator that simply returns the user ID
jest.mock("../../../auth/decorators/current-user.decorator", () => ({
  CurrentUser:
    () => (target: any, key: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;
      descriptor.value = function () {
        // Replace the user object with just the ID for the controller
        return originalMethod.apply(this, ["user1"]);
      };
      return descriptor;
    },
}));

describe("UserRelationshipController", () => {
  let controller: UserRelationshipController;
  let userRelationshipService: Partial<UserRelationshipService>;

  // Define a minimal mock AgeVerification object
  const mockAgeVerification: AgeVerification = {
    id: "av1",
    userId: "user1",
    user: undefined as any, // Avoid circular mock, type as any for test
    onfidoApplicantId: "onfido-app-id",
    onfidoCheckId: "onfido-check-id",
    status: AgeVerificationStatus.PENDING,
    documentType: "passport",
    createdAt: new Date(),
    updatedAt: new Date(),
    verifiedAt: null as any, // Use null as any to bypass strict type
    rejectionReason: null as any, // Use null as any to bypass strict type
  };

  // Define a more complete mock user object
  const mockUser: User = {
    id: "user1",
    email: "user1@example.com",
    username: "userone",
    displayName: "User One",
    passwordHash: "hashedpassword", // Include required fields
    photoURL: undefined,
    bio: undefined,
    interests: [],
    isVerified: true,
    isPremium: false,
    isAgeVerified: true,
    isOnline: false,
    locationLatitude: undefined,
    locationLongitude: undefined,
    status: UserStatus.ACTIVE,
    roles: [UserRole.USER],
    createdAt: new Date(),
    updatedAt: new Date(),
    ageVerification: mockAgeVerification, // Assign the mock object
    // Add location getter/setter if needed by tests, otherwise omit
    get location() {
      return null;
    },
    set location(loc) {
      /* no-op */
    },
  };

  const mockRelationshipResponse = {
    id: "rel1",
    type: RelationshipType.PENDING,
    direction: "outgoing",
    createdAt: new Date(),
    updatedAt: new Date(),
    message: "Hello!",
    user: {
      id: "user2",
      username: "recipient",
      displayName: "Recipient User",
      photoURL: "https://example.com/recipient.jpg",
      bio: "Recipient bio",
    },
  };

  const mockPaginatedResponse = {
    items: [mockRelationshipResponse],
    total: 1,
    page: 1,
    limit: 20,
    hasMore: false,
  };

  beforeEach(async () => {
    // Mock service
    userRelationshipService = {
      sendConnectionRequest: jest
        .fn()
        .mockResolvedValue(mockRelationshipResponse),
      getConnections: jest.fn().mockResolvedValue(mockPaginatedResponse),
      getPendingRequests: jest
        .fn()
        .mockResolvedValue([mockRelationshipResponse]),
      respondToRequest: jest.fn().mockResolvedValue(mockRelationshipResponse),
      blockUser: jest.fn().mockResolvedValue(mockRelationshipResponse),
      unblockUser: jest.fn().mockResolvedValue({ success: true }),
      getBlockedUsers: jest.fn().mockResolvedValue(mockPaginatedResponse),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserRelationshipController],
      providers: [
        {
          provide: UserRelationshipService,
          useValue: userRelationshipService,
        },
      ],
    }).compile();

    controller = module.get<UserRelationshipController>(
      UserRelationshipController,
    );
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("sendConnectionRequest", () => {
    it("should send a connection request successfully", async () => {
      const dto = { recipientId: "user2", message: "Hello!" };

      // Pass mockUser instead of null
      const result = await controller.sendConnectionRequest(mockUser, dto);

      expect(
        userRelationshipService.sendConnectionRequest,
      ).toHaveBeenCalledWith("user1", dto);
      expect(result).toEqual(mockRelationshipResponse);
    });

    it("should handle errors gracefully", async () => {
      const dto = { recipientId: "user2", message: "Hello!" };
      (
        userRelationshipService.sendConnectionRequest as jest.Mock
      ).mockRejectedValueOnce(new Error("Failed to send request"));

      // Pass mockUser instead of null
      await expect(
        controller.sendConnectionRequest(mockUser, dto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getConnections", () => {
    it("should get all connections", async () => {
      // Pass mockUser instead of null
      const result = await controller.getConnections(mockUser, 1, 20);

      expect(userRelationshipService.getConnections).toHaveBeenCalledWith(
        "user1",
        1,
        20,
      );
      expect(result).toEqual(mockPaginatedResponse);
    });
  });

  describe("getPendingRequests", () => {
    it("should get all pending requests", async () => {
      // Pass mockUser instead of null
      const result = await controller.getPendingRequests(mockUser);

      expect(userRelationshipService.getPendingRequests).toHaveBeenCalledWith(
        "user1",
      );
      expect(result).toEqual([mockRelationshipResponse]);
    });
  });

  describe("respondToRequest", () => {
    it("should respond to a request", async () => {
      const dto = {
        relationshipId: "rel1",
        status: ConnectionResponseStatus.ACCEPT,
      };

      // Pass mockUser instead of null
      const result = await controller.respondToRequest(mockUser, "rel1", dto);

      expect(userRelationshipService.respondToRequest).toHaveBeenCalledWith(
        "user1",
        dto,
      );
      expect(result).toEqual(mockRelationshipResponse);
    });
  });

  describe("blockUser", () => {
    it("should block a user", async () => {
      const dto = { userId: "user2", reason: "Spam" };

      // Pass mockUser instead of null
      const result = await controller.blockUser(mockUser, dto);

      expect(userRelationshipService.blockUser).toHaveBeenCalledWith(
        "user1",
        dto,
      );
      expect(result).toEqual(mockRelationshipResponse);
    });
  });

  describe("unblockUser", () => {
    it("should unblock a user", async () => {
      // Pass mockUser instead of null
      const result = await controller.unblockUser(mockUser, "user2");

      expect(userRelationshipService.unblockUser).toHaveBeenCalledWith(
        "user1",
        "user2",
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe("getBlockedUsers", () => {
    it("should get all blocked users", async () => {
      // Pass mockUser instead of null
      const result = await controller.getBlockedUsers(mockUser, 1, 20);

      expect(userRelationshipService.getBlockedUsers).toHaveBeenCalledWith(
        "user1",
        1,
        20,
      );
      expect(result).toEqual(mockPaginatedResponse);
    });
  });
});
