import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { UserRelationshipRepository } from "../repositories/user-relationship.repository";
import { UserRepository } from "../repositories/user.repository";
import { ConnectionRequestDto } from "../dto/connection-request.dto";
import {
  ConnectionResponseDto,
  ConnectionResponseStatus,
} from "../dto/connection-response.dto";
import { BlockUserDto } from "../dto/block-user.dto";
import {
  RelationshipType,
  RelationshipDirection,
} from "../entities/user-relationship.entity";
import {
  UserRelationshipResponseDto,
  RelationshipPaginatedResponseDto,
  UserProfileDto,
} from "../dto/user-relationship-response.dto";
import { EventEmitter2 } from "@nestjs/event-emitter";

// Default connection limit for free tier users
const FREE_TIER_CONNECTION_LIMIT = 50;

@Injectable()
export class UserRelationshipService {
  constructor(
    private readonly userRelationshipRepository: UserRelationshipRepository,
    private readonly userRepository: UserRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Send a connection request to another user
   */
  async sendConnectionRequest(
    requesterId: string,
    dto: ConnectionRequestDto,
  ): Promise<UserRelationshipResponseDto> {
    // Check if recipient exists
    const recipient = await this.userRepository.findById(dto.recipientId);
    if (!recipient) {
      throw new NotFoundException(`User with ID ${dto.recipientId} not found`);
    }

    // Check if there's already a relationship
    const existingRelationship =
      await this.userRelationshipRepository.findByUsers(
        requesterId,
        dto.recipientId,
      );

    if (existingRelationship) {
      if (existingRelationship.type === RelationshipType.BLOCKED) {
        throw new BadRequestException("Cannot send request to a blocked user");
      }
      throw new BadRequestException(
        "A relationship already exists with this user",
      );
    }

    // Check if recipient has blocked requester
    const blockedByRecipient =
      await this.userRelationshipRepository.findByUsers(
        dto.recipientId,
        requesterId,
      );

    if (
      blockedByRecipient &&
      blockedByRecipient.type === RelationshipType.BLOCKED
    ) {
      throw new BadRequestException("Cannot send request to this user");
    }

    // For free users, check connection limit
    await this.enforceConnectionLimit(requesterId);

    // Create the request
    const relationship = await this.userRelationshipRepository.create(
      requesterId,
      dto,
    );

    // Emit event for notifications
    this.eventEmitter.emit("user.connection.requested", {
      requesterId,
      recipientId: dto.recipientId,
      relationshipId: relationship.id,
      message: dto.message,
    });

    // Transform to response DTO
    return this.transformToResponseDto(relationship, requesterId);
  }

  /**
   * Respond to a connection request (accept or decline)
   */
  async respondToRequest(
    userId: string,
    dto: ConnectionResponseDto,
  ): Promise<UserRelationshipResponseDto> {
    // Find the relationship
    const relationship = await this.userRelationshipRepository.findById(
      dto.relationshipId,
    );

    if (!relationship) {
      throw new NotFoundException(
        `Relationship with ID ${dto.relationshipId} not found`,
      );
    }

    // Check if user is the recipient
    if (relationship.recipientId !== userId) {
      throw new ForbiddenException(
        "You do not have permission to respond to this request",
      );
    }

    // Check if the request is pending
    if (relationship.type !== RelationshipType.PENDING) {
      throw new BadRequestException("This request is not pending");
    }

    if (dto.status === ConnectionResponseStatus.ACCEPT) {
      // Update relationship to accepted
      const updatedRelationship =
        await this.userRelationshipRepository.updateRelationshipType(
          relationship.id,
          RelationshipType.ACCEPTED,
        );

      if (!updatedRelationship) {
        throw new BadRequestException("Failed to update relationship");
      }

      // Emit event for notifications
      this.eventEmitter.emit("user.connection.accepted", {
        requesterId: relationship.requesterId,
        recipientId: userId,
        relationshipId: relationship.id,
      });

      return this.transformToResponseDto(updatedRelationship, userId);
    } else {
      // Decline - delete the relationship
      await this.userRelationshipRepository.removeById(relationship.id);

      // Emit event for notifications
      this.eventEmitter.emit("user.connection.declined", {
        requesterId: relationship.requesterId,
        recipientId: userId,
        relationshipId: relationship.id,
      });

      // Create a mock response for the client
      const emptyProfile: UserProfileDto = {
        id: "",
        username: "",
        displayName: "",
        photoURL: "",
        bio: "",
      };

      // Return a response with empty user data
      return {
        id: relationship.id,
        type: RelationshipType.PENDING,
        direction: RelationshipDirection.INCOMING,
        createdAt: relationship.createdAt,
        updatedAt: relationship.updatedAt,
        message: relationship.message,
        user: emptyProfile,
      };
    }
  }

  /**
   * Block a user
   */
  async blockUser(
    userId: string,
    dto: BlockUserDto,
  ): Promise<UserRelationshipResponseDto> {
    // Check if user exists
    const targetUser = await this.userRepository.findById(dto.userId);
    if (!targetUser) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }

    // Block user
    const relationship = await this.userRelationshipRepository.blockUser(
      userId,
      dto.userId,
      dto.reason,
    );

    // Emit event for notifications
    this.eventEmitter.emit("user.blocked", {
      blockerId: userId,
      blockedId: dto.userId,
      reason: dto.reason,
      report: dto.report,
    });

    return this.transformToResponseDto(relationship, userId);
  }

  /**
   * Unblock a user
   */
  async unblockUser(
    userId: string,
    targetUserId: string,
  ): Promise<{ success: boolean }> {
    // Find the relationship
    const relationship = await this.userRelationshipRepository.findByUsers(
      userId,
      targetUserId,
    );

    if (!relationship || relationship.type !== RelationshipType.BLOCKED) {
      throw new BadRequestException("No block relationship found");
    }

    // Remove the relationship
    await this.userRelationshipRepository.unblockUser(userId, targetUserId);

    return { success: true };
  }

  /**
   * Get all user connections (friends)
   */
  async getConnections(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<RelationshipPaginatedResponseDto> {
    const [relationships, total] =
      await this.userRelationshipRepository.findUserRelationships(
        userId,
        RelationshipType.ACCEPTED,
        page,
        limit,
      );

    const items = await Promise.all(
      relationships.map((relationship) =>
        this.transformToResponseDto(relationship, userId),
      ),
    );

    return {
      items,
      total,
      page,
      limit,
      hasMore: total > page * limit,
    };
  }

  /**
   * Get all pending requests
   */
  async getPendingRequests(
    userId: string,
  ): Promise<UserRelationshipResponseDto[]> {
    const relationships =
      await this.userRelationshipRepository.findPendingRequests(userId);

    return Promise.all(
      relationships.map((relationship) =>
        this.transformToResponseDto(relationship, userId),
      ),
    );
  }

  /**
   * Get all blocked users
   */
  async getBlockedUsers(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<RelationshipPaginatedResponseDto> {
    const [relationships, total] =
      await this.userRelationshipRepository.findUserRelationships(
        userId,
        RelationshipType.BLOCKED,
        page,
        limit,
      );

    const items = await Promise.all(
      relationships.map((relationship) =>
        this.transformToResponseDto(relationship, userId),
      ),
    );

    return {
      items,
      total,
      page,
      limit,
      hasMore: total > page * limit,
    };
  }

  /**
   * Transform a relationship entity to a response DTO
   */
  private async transformToResponseDto(
    relationship: any,
    currentUserId: string,
  ): Promise<UserRelationshipResponseDto> {
    // Determine direction
    let direction: RelationshipDirection;
    let otherUserId: string;

    if (relationship.requesterId === currentUserId) {
      direction = RelationshipDirection.OUTGOING;
      otherUserId = relationship.recipientId;
    } else if (relationship.recipientId === currentUserId) {
      direction = RelationshipDirection.INCOMING;
      otherUserId = relationship.requesterId;
    } else {
      // Should not happen, but just in case
      direction = RelationshipDirection.MUTUAL;
      otherUserId = relationship.recipientId;
    }

    // Get other user data
    const otherUser = await this.userRepository.findById(otherUserId);

    // Create default user profile in case user is not found
    const userProfile: UserProfileDto = {
      id: otherUser?.id || "",
      username: otherUser?.username || "",
      displayName: otherUser?.displayName || "",
      photoURL: otherUser?.photoURL || "",
      bio: otherUser?.bio || "",
    };

    return {
      id: relationship.id,
      type: relationship.type,
      direction,
      createdAt: relationship.createdAt,
      updatedAt: relationship.updatedAt,
      message: relationship.message,
      user: userProfile,
    };
  }

  /**
   * Enforce connection limit for free tier users
   */
  private async enforceConnectionLimit(userId: string): Promise<void> {
    // Check if user is premium
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Skip limit check for premium users
    if (user.isPremium) {
      return;
    }

    // Count existing connections for free users
    const [, total] =
      await this.userRelationshipRepository.findUserRelationships(
        userId,
        RelationshipType.ACCEPTED,
      );

    const [pendingRequests] =
      await this.userRelationshipRepository.findUserRelationships(
        userId,
        RelationshipType.PENDING,
      );

    const totalConnections = total + pendingRequests.length;

    if (totalConnections >= FREE_TIER_CONNECTION_LIMIT) {
      throw new ForbiddenException(
        `Free tier users are limited to ${FREE_TIER_CONNECTION_LIMIT} connections. Upgrade to premium for unlimited connections.`,
      );
    }
  }
}
