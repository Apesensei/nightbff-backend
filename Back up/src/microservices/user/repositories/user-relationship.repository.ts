import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import {
  UserRelationship,
  RelationshipType,
} from "../entities/user-relationship.entity";
import { ConnectionRequestDto } from "../dto/connection-request.dto";

@Injectable()
export class UserRelationshipRepository {
  constructor(
    @InjectRepository(UserRelationship)
    private readonly repository: Repository<UserRelationship>,
  ) {}

  async create(
    requesterId: string,
    dto: ConnectionRequestDto,
  ): Promise<UserRelationship> {
    const relationship = this.repository.create({
      requesterId,
      recipientId: dto.recipientId,
      type: dto.type || RelationshipType.PENDING,
      message: dto.message,
    });

    return this.repository.save(relationship);
  }

  async findById(id: string): Promise<UserRelationship | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByUsers(
    requesterId: string,
    recipientId: string,
  ): Promise<UserRelationship | null> {
    return this.repository.findOne({
      where: { requesterId, recipientId },
    });
  }

  async findRelationshipBetweenUsers(
    userIdA: string,
    userIdB: string,
  ): Promise<UserRelationship[]> {
    return this.repository.find({
      where: [
        { requesterId: userIdA, recipientId: userIdB },
        { requesterId: userIdB, recipientId: userIdA },
      ],
    });
  }

  async findUserRelationships(
    userId: string,
    type?: RelationshipType,
    page = 1,
    limit = 20,
  ): Promise<[UserRelationship[], number]> {
    const queryBuilder = this.repository
      .createQueryBuilder("relationship")
      .leftJoinAndSelect("relationship.requester", "requester")
      .leftJoinAndSelect("relationship.recipient", "recipient")
      .where(
        "(relationship.requesterId = :userId OR relationship.recipientId = :userId)",
        { userId },
      );

    if (type) {
      queryBuilder.andWhere("relationship.type = :type", { type });
    }

    return queryBuilder
      .orderBy("relationship.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  async findPendingRequests(userId: string): Promise<UserRelationship[]> {
    return this.repository.find({
      where: {
        recipientId: userId,
        type: RelationshipType.PENDING,
      },
      relations: ["requester"],
    });
  }

  async update(
    id: string,
    data: Partial<UserRelationship>,
  ): Promise<UserRelationship | null> {
    await this.repository.update(id, data);
    return this.findById(id);
  }

  async updateRelationshipType(
    id: string,
    type: RelationshipType,
  ): Promise<UserRelationship | null> {
    return this.update(id, { type });
  }

  async removeById(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async blockUser(
    requesterId: string,
    recipientId: string,
    reason?: string,
  ): Promise<UserRelationship> {
    // First, remove any existing relationship
    await this.repository.delete({
      requesterId: In([requesterId, recipientId]),
      recipientId: In([requesterId, recipientId]),
    });

    // Then create a block relationship
    const blockRelationship = this.repository.create({
      requesterId,
      recipientId,
      type: RelationshipType.BLOCKED,
      reportReason: reason,
    });

    return this.repository.save(blockRelationship);
  }

  async unblockUser(requesterId: string, recipientId: string): Promise<void> {
    await this.repository.delete({
      requesterId,
      recipientId,
      type: RelationshipType.BLOCKED,
    });
  }

  async isUserBlocked(userIdA: string, userIdB: string): Promise<boolean> {
    const count = await this.repository.count({
      where: [
        {
          requesterId: userIdA,
          recipientId: userIdB,
          type: RelationshipType.BLOCKED,
        },
        {
          requesterId: userIdB,
          recipientId: userIdA,
          type: RelationshipType.BLOCKED,
        },
      ],
    });

    return count > 0;
  }

  async reportUser(
    relationshipId: string,
    reason: string,
  ): Promise<UserRelationship | null> {
    return this.update(relationshipId, {
      isReported: true,
      reportReason: reason,
    });
  }
}
