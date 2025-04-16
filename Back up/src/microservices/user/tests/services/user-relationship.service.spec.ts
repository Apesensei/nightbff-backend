import { Test, TestingModule } from "@nestjs/testing";
import { UserRelationshipService } from "../../services/user-relationship.service";
import { UserRelationshipRepository } from "../../repositories/user-relationship.repository";
import { UserRepository } from "../../repositories/user.repository";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { RelationshipType } from "../../entities/user-relationship.entity";
import { ConnectionResponseStatus } from "../../dto/connection-response.dto";

describe("UserRelationshipService", () => {
  let service: UserRelationshipService;
  let userRelationshipRepository: Partial<UserRelationshipRepository>;
  let userRepository: Partial<UserRepository>;
  let eventEmitter: Partial<EventEmitter2>;

  const mockUser = {
    id: "user1",
    username: "testuser",
    displayName: "Test User",
    photoURL: "https://example.com/photo.jpg",
    bio: "Test bio",
    isPremium: false,
  };

  const mockRecipient = {
    id: "user2",
    username: "recipient",
    displayName: "Recipient User",
    photoURL: "https://example.com/recipient.jpg",
    bio: "Recipient bio",
    isPremium: false,
  };

  const mockRelationship = {
    id: "rel1",
    requesterId: "user1",
    recipientId: "user2",
    type: RelationshipType.PENDING,
    message: "Hello!",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    // Mock repositories and event emitter
    userRelationshipRepository = {
      create: jest.fn().mockResolvedValue(mockRelationship),
      findById: jest.fn().mockResolvedValue(mockRelationship),
      findByUsers: jest.fn().mockResolvedValue(null),
      findUserRelationships: jest
        .fn()
        .mockResolvedValue([[mockRelationship], 1]),
      findPendingRequests: jest.fn().mockResolvedValue([mockRelationship]),
      updateRelationshipType: jest.fn().mockImplementation((id, type) => {
        return Promise.resolve({
          ...mockRelationship,
          type,
        });
      }),
      removeById: jest.fn().mockResolvedValue(undefined),
      blockUser: jest.fn().mockResolvedValue({
        ...mockRelationship,
        type: RelationshipType.BLOCKED,
      }),
      unblockUser: jest.fn().mockResolvedValue(undefined),
    };

    userRepository = {
      findById: jest.fn().mockImplementation((id) => {
        if (id === "user1") return Promise.resolve(mockUser);
        if (id === "user2") return Promise.resolve(mockRecipient);
        return Promise.resolve(null);
      }),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRelationshipService,
        {
          provide: UserRelationshipRepository,
          useValue: userRelationshipRepository,
        },
        {
          provide: UserRepository,
          useValue: userRepository,
        },
        {
          provide: EventEmitter2,
          useValue: eventEmitter,
        },
      ],
    }).compile();

    service = module.get<UserRelationshipService>(UserRelationshipService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("sendConnectionRequest", () => {
    it("should send a connection request successfully", async () => {
      const dto = { recipientId: "user2", message: "Hello!" };
      const result = await service.sendConnectionRequest("user1", dto);

      expect(userRepository.findById).toHaveBeenCalledWith("user2");
      expect(userRelationshipRepository.findByUsers).toHaveBeenCalledWith(
        "user1",
        "user2",
      );
      expect(userRelationshipRepository.create).toHaveBeenCalledWith(
        "user1",
        dto,
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "user.connection.requested",
        expect.any(Object),
      );
      expect(result).toBeDefined();
    });

    it("should throw NotFoundException if recipient does not exist", async () => {
      const dto = { recipientId: "nonexistent", message: "Hello!" };
      (userRepository.findById as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.sendConnectionRequest("user1", dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException if relationship already exists", async () => {
      const dto = { recipientId: "user2", message: "Hello!" };
      (
        userRelationshipRepository.findByUsers as jest.Mock
      ).mockResolvedValueOnce(mockRelationship);

      await expect(service.sendConnectionRequest("user1", dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should enforce connection limit for free users", async () => {
      const dto = { recipientId: "user2", message: "Hello!" };

      // Mock reaching the connection limit
      (
        userRelationshipRepository.findUserRelationships as jest.Mock
      ).mockResolvedValueOnce([Array(50).fill(mockRelationship), 50]); // Mock 50 connections for free user

      await expect(service.sendConnectionRequest("user1", dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should not enforce connection limit for premium users", async () => {
      const dto = { recipientId: "user2", message: "Hello!" };

      // Override isPremium
      (userRepository.findById as jest.Mock).mockResolvedValueOnce({
        ...mockUser,
        isPremium: true,
      });

      // Should not check limit
      await service.sendConnectionRequest("user1", dto);

      expect(userRelationshipRepository.create).toHaveBeenCalled();
    });
  });

  describe("respondToRequest", () => {
    it("should accept a connection request", async () => {
      const dto = {
        relationshipId: "rel1",
        status: ConnectionResponseStatus.ACCEPT,
      };

      const result = await service.respondToRequest("user2", dto);

      expect(userRelationshipRepository.findById).toHaveBeenCalledWith("rel1");
      expect(
        userRelationshipRepository.updateRelationshipType,
      ).toHaveBeenCalledWith("rel1", RelationshipType.ACCEPTED);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "user.connection.accepted",
        expect.any(Object),
      );
      expect(result).toBeDefined();
      expect(result.type).toBe(RelationshipType.ACCEPTED);
    });

    it("should decline a connection request", async () => {
      const dto = {
        relationshipId: "rel1",
        status: ConnectionResponseStatus.DECLINE,
      };

      await service.respondToRequest("user2", dto);

      expect(userRelationshipRepository.findById).toHaveBeenCalledWith("rel1");
      expect(userRelationshipRepository.removeById).toHaveBeenCalledWith(
        "rel1",
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "user.connection.declined",
        expect.any(Object),
      );
    });

    it("should throw NotFoundException if relationship does not exist", async () => {
      const dto = {
        relationshipId: "nonexistent",
        status: ConnectionResponseStatus.ACCEPT,
      };

      (userRelationshipRepository.findById as jest.Mock).mockResolvedValueOnce(
        null,
      );

      await expect(service.respondToRequest("user2", dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ForbiddenException if user is not the recipient", async () => {
      const dto = {
        relationshipId: "rel1",
        status: ConnectionResponseStatus.ACCEPT,
      };

      // Try to respond as the requester, not recipient
      await expect(service.respondToRequest("user1", dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should throw BadRequestException if request is not pending", async () => {
      const dto = {
        relationshipId: "rel1",
        status: ConnectionResponseStatus.ACCEPT,
      };

      // Relationship already accepted
      (userRelationshipRepository.findById as jest.Mock).mockResolvedValueOnce({
        ...mockRelationship,
        type: RelationshipType.ACCEPTED,
      });

      await expect(service.respondToRequest("user2", dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("blockUser", () => {
    it("should block a user successfully", async () => {
      const dto = { userId: "user2", reason: "Spam" };

      const result = await service.blockUser("user1", dto);

      expect(userRepository.findById).toHaveBeenCalledWith("user2");
      expect(userRelationshipRepository.blockUser).toHaveBeenCalledWith(
        "user1",
        "user2",
        "Spam",
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "user.blocked",
        expect.any(Object),
      );
      expect(result).toBeDefined();
      expect(result.type).toBe(RelationshipType.BLOCKED);
    });

    it("should throw NotFoundException if target user does not exist", async () => {
      const dto = { userId: "nonexistent", reason: "Spam" };

      (userRepository.findById as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.blockUser("user1", dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("unblockUser", () => {
    it("should unblock a user successfully", async () => {
      // Mock an existing block relationship
      (
        userRelationshipRepository.findByUsers as jest.Mock
      ).mockResolvedValueOnce({
        ...mockRelationship,
        type: RelationshipType.BLOCKED,
      });

      const result = await service.unblockUser("user1", "user2");

      expect(userRelationshipRepository.findByUsers).toHaveBeenCalledWith(
        "user1",
        "user2",
      );
      expect(userRelationshipRepository.unblockUser).toHaveBeenCalledWith(
        "user1",
        "user2",
      );
      expect(result).toEqual({ success: true });
    });

    it("should throw BadRequestException if no block relationship exists", async () => {
      // No relationship
      (
        userRelationshipRepository.findByUsers as jest.Mock
      ).mockResolvedValueOnce(null);

      await expect(service.unblockUser("user1", "user2")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException if relationship is not a block", async () => {
      // Relationship exists but not a block
      (
        userRelationshipRepository.findByUsers as jest.Mock
      ).mockResolvedValueOnce({
        ...mockRelationship,
        type: RelationshipType.ACCEPTED,
      });

      await expect(service.unblockUser("user1", "user2")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("getConnections", () => {
    it("should get all connections", async () => {
      const result = await service.getConnections("user1");

      expect(
        userRelationshipRepository.findUserRelationships,
      ).toHaveBeenCalledWith("user1", RelationshipType.ACCEPTED, 1, 20);
      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
    });
  });

  describe("getPendingRequests", () => {
    it("should get all pending requests", async () => {
      const result = await service.getPendingRequests("user1");

      expect(
        userRelationshipRepository.findPendingRequests,
      ).toHaveBeenCalledWith("user1");
      expect(result).toHaveLength(1);
    });
  });
});
