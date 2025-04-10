import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DeleteResult, Not, IsNull } from "typeorm";
import { Follow } from "../entities/follow.entity";

@Injectable()
export class FollowRepository {
  private readonly logger = new Logger(FollowRepository.name);

  constructor(
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
  ) {}

  /**
   * Creates a follow relationship.
   * Assumes checks for existing follow and valid entities are done in the service.
   */
  async createFollow(userId: string, followedVenueId: string): Promise<Follow> {
    this.logger.debug(
      `Creating follow: User ${userId} -> Venue ${followedVenueId}`,
    );
    try {
      const follow = this.followRepository.create({ userId, followedVenueId });
      return await this.followRepository.save(follow);
    } catch (error) {
      this.logger.error(
        `Failed to create follow for User ${userId} -> Venue ${followedVenueId}: ${error.message}`,
        error.stack,
      );
      // Rethrow or handle appropriately based on service layer needs
      throw error;
    }
  }

  /**
   * Deletes a follow relationship.
   */
  async deleteFollow(
    userId: string,
    followedVenueId: string,
  ): Promise<DeleteResult> {
    this.logger.debug(
      `Deleting follow: User ${userId} -> Venue ${followedVenueId}`,
    );
    try {
      return await this.followRepository.delete({ userId, followedVenueId });
    } catch (error) {
      this.logger.error(
        `Failed to delete follow for User ${userId} -> Venue ${followedVenueId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Finds a specific follow relationship. Returns null if not found.
   */
  async findFollow(
    userId: string,
    followedVenueId: string,
  ): Promise<Follow | null> {
    this.logger.debug(
      `Finding follow: User ${userId} -> Venue ${followedVenueId}`,
    );
    try {
      return await this.followRepository.findOne({
        where: { userId, followedVenueId },
      });
    } catch (error) {
      this.logger.error(
        `Failed to find follow for User ${userId} -> Venue ${followedVenueId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Counts the number of followers for a specific venue.
   */
  async countFollowers(followedVenueId: string): Promise<number> {
    this.logger.debug(`Counting followers for Venue ${followedVenueId}`);
    try {
      return await this.followRepository.count({ where: { followedVenueId } });
    } catch (error) {
      this.logger.error(
        `Failed to count followers for Venue ${followedVenueId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Finds all venues followed by a specific user.
   * TODO: Add pagination if needed.
   */
  async findFollowedVenues(userId: string): Promise<Follow[]> {
    this.logger.debug(`Finding venues followed by User ${userId}`);
    try {
      return await this.followRepository.find({
        where: { userId, followedVenueId: Not(IsNull()) }, // Ensure we only get venue follows
        select: ["followedVenueId", "createdAt"], // Select only necessary fields
      });
    } catch (error) {
      this.logger.error(
        `Failed to find followed venues for User ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
