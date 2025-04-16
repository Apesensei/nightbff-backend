import { Injectable, BadRequestException } from "@nestjs/common";
import {
  UserRepository,
  UserWithDistance,
} from "../repositories/user.repository";
import { UserRelationshipRepository } from "../repositories/user-relationship.repository";
import { ProfileViewRepository } from "../repositories/profile-view.repository";
import { RelationshipType } from "../entities/user-relationship.entity";

export interface ViewerWithTimestamp extends UserWithDistance {
  viewedAt: Date;
}

@Injectable()
export class UserDiscoveryService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userRelationshipRepository: UserRelationshipRepository,
    private readonly profileViewRepository: ProfileViewRepository,
  ) {}

  /**
   * Find nearby users based on geolocation
   */
  async findNearbyUsers(
    userId: string,
    latitude: number,
    longitude: number,
    options?: {
      radiusInKm?: number;
      limit?: number;
      offset?: number;
      activeOnly?: boolean;
      activeWithinMinutes?: number;
    },
  ): Promise<{ users: UserWithDistance[]; total: number }> {
    const {
      radiusInKm = 5,
      limit = 20,
      offset = 0,
      activeOnly = false,
      activeWithinMinutes = 30,
    } = options || {};

    // Validate coordinates
    if (isNaN(latitude) || isNaN(longitude)) {
      throw new BadRequestException("Invalid coordinates provided");
    }

    // Get users who blocked the current user
    const [blockedBy] =
      await this.userRelationshipRepository.findUserRelationships(
        userId,
        RelationshipType.BLOCKED,
      );

    // Get users that the current user has blocked
    const [blockedUsers] =
      await this.userRelationshipRepository.findUserRelationships(
        userId,
        RelationshipType.BLOCKED,
      );

    // Extract user IDs from relationships
    const excludeUserIds = [
      ...blockedBy.map((r) =>
        r.requesterId === userId ? r.recipientId : r.requesterId,
      ),
      ...blockedUsers.map((r) =>
        r.requesterId === userId ? r.recipientId : r.requesterId,
      ),
    ];

    const params = {
      latitude,
      longitude,
      radiusInKm,
      excludeUserIds,
      limit,
      offset,
    };

    let users: UserWithDistance[];
    let total: number;

    if (activeOnly) {
      [users, total] = await this.userRepository.findActiveNearbyUsers(
        params,
        userId,
        activeWithinMinutes,
      );
    } else {
      [users, total] = await this.userRepository.findNearbyUsers(
        params,
        userId,
      );
    }

    return { users, total };
  }

  /**
   * Get recommended users based on various factors
   */
  async getRecommendedUsers(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
    },
  ): Promise<{ users: UserWithDistance[]; total: number }> {
    const { limit = 20, offset = 0 } = options || {};

    // Get user's current location
    const currentUser = await this.userRepository.findById(userId);
    if (
      !currentUser ||
      !currentUser.locationLatitude ||
      !currentUser.locationLongitude
    ) {
      throw new BadRequestException("User location not available");
    }

    // Get friends to boost similar users - // TODO: Implement scoring based on friends
    // const [friends] = // Removed unused variable and call
    //   await this.userRelationshipRepository.findUserRelationships(
    //     userId,
    //     RelationshipType.ACCEPTED,
    //   );

    // For now, use the nearby users functionality as base
    // and implement additional scoring/filtering in future versions
    return this.findNearbyUsers(
      userId,
      currentUser.locationLatitude,
      currentUser.locationLongitude,
      {
        radiusInKm: 10, // Expand search radius for recommendations
        limit,
        offset,
        activeWithinMinutes: 60 * 24, // Active within last 24 hours
      },
    );
  }

  /**
   * Get users who viewed current user's profile
   */
  async getProfileViewers(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
    },
  ): Promise<{ users: ViewerWithTimestamp[]; total: number }> {
    const { limit = 20, offset = 0 } = options || {};

    // Get profile views
    const [views] = await this.profileViewRepository.getViewsForUser(
      userId,
      Math.ceil(offset / limit) + 1, // Calculate page
      limit,
    );

    const viewerIds = views.map((view) => view.viewerId);

    if (viewerIds.length === 0) {
      return { users: [], total: 0 };
    }

    // Get viewers' profiles
    const viewers = await Promise.all(
      viewerIds.map(async (viewerId) => {
        const user = await this.userRepository.findById(viewerId);
        return user;
      }),
    );

    // Filter out null values and add view timestamp
    const usersWithViewInfo = viewers
      .filter((user) => user !== null)
      .map((user, index) => {
        const view = views[index];
        return {
          ...user!,
          viewedAt: view.createdAt,
          distance: 0, // Placeholder for distance
        } as ViewerWithTimestamp;
      });

    // Get total count
    const total =
      await this.profileViewRepository.countUniqueViewersForUser(userId);

    return {
      users: usersWithViewInfo,
      total,
    };
  }
}
