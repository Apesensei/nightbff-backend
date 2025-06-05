import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  UserRepository,
  UserWithDistance,
} from "../repositories/user.repository";
import { UserRelationshipRepository } from "../repositories/user-relationship.repository";
import { ProfileViewRepository } from "../repositories/profile-view.repository";
import { RelationshipType } from "../entities/user-relationship.entity";
import {
  UserProfile,
  Gender,
  GenderPreference,
} from "../entities/user-profile.entity";
import { calculateAge } from "../../../common/utils/date.utils";
import { HomepageRecommendationDto } from "../dto/homepage-recommendation.dto";

export interface ViewerWithTimestamp extends UserWithDistance {
  viewedAt: Date;
}

// Define constants for limits
const FETCH_LIMIT = 100; // Candidate pool size
const RECOMMENDATION_LIMIT = 20; // Final number of recommendations

@Injectable()
export class UserDiscoveryService {
  private readonly logger = new Logger(UserDiscoveryService.name);

  constructor(
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
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

  async getHomepageRecommendations(
    currentUserId: string,
  ): Promise<HomepageRecommendationDto[]> {
    this.logger.log(
      `Fetching homepage recommendations for user: ${currentUserId}`,
    );
    try {
      // Phase 1: Fetch Current User Profile (using injected standard repository)
      const currentUserProfile = await this.userProfileRepository
        .createQueryBuilder("profile")
        .innerJoinAndSelect("profile.user", "user")
        .where("profile.userId = :userId", { userId: currentUserId })
        .getOne();

      if (!currentUserProfile || !currentUserProfile.user) {
        this.logger.warn(
          `User profile or user not found for ID: ${currentUserId}`,
        );
        throw new NotFoundException("User profile not found.");
      }
      this.logger.debug(
        `Fetched current user profile: ${currentUserProfile.userId}`,
      );

      const blockedUserIds =
        await this.userRelationshipRepository.findBlockedUserIds(currentUserId);
      this.logger.debug(`Fetched blocked user IDs: ${blockedUserIds.length}`);

      // Phase 2: Candidate Fetching & Initial Filtering
      const excludeUserIds = [currentUserId, ...blockedUserIds];
      // Use the standard repository's createQueryBuilder for consistency
      const candidates = await this.userProfileRepository
        .createQueryBuilder("candidateProfile")
        .innerJoinAndSelect("candidateProfile.user", "candidateUser") // Alias properly
        .select([
          "candidateProfile.userId", // Select specific fields needed
          "candidateProfile.gender",
          "candidateProfile.birthDate",
          "candidateProfile.lastActiveAt",
          "candidateProfile.genderPreference", // Include preferences if needed later, or remove
          "candidateProfile.minAgePreference",
          "candidateProfile.maxAgePreference",
          "candidateUser.displayName",
          "candidateUser.photoURL",
        ])
        .where("candidateProfile.lastActiveAt IS NOT NULL")
        .andWhere("candidateProfile.userId NOT IN (:...excludeUserIds)", {
          excludeUserIds,
        })
        .orderBy("candidateProfile.lastActiveAt", "DESC")
        .limit(FETCH_LIMIT)
        .getMany();

      this.logger.debug(`Fetched ${candidates.length} initial candidates.`);

      const ageFilteredCandidates = candidates.filter((candidate) => {
        const age = calculateAge(candidate.birthDate);
        if (age === null) return false; // Exclude candidates without birthdate

        const minAgePref = currentUserProfile.minAgePreference;
        const maxAgePref = currentUserProfile.maxAgePreference;

        // Apply age filtering based on preferences, checking for undefined/null
        if (minAgePref !== null && minAgePref !== undefined && age < minAgePref)
          return false;
        if (maxAgePref !== null && maxAgePref !== undefined && age > maxAgePref)
          return false;

        return true;
      });
      this.logger.debug(
        `Filtered ${ageFilteredCandidates.length} candidates by age preference.`,
      );

      // Phase 3: Gender Filtering & Final Selection
      const finalCandidates = this._filterAndSortByGenderPreference(
        ageFilteredCandidates,
        currentUserProfile.genderPreference,
        RECOMMENDATION_LIMIT,
      );
      this.logger.debug(
        `Filtered ${finalCandidates.length} candidates by gender preference.`,
      );

      // Phase 3: Map to DTO
      const recommendations: HomepageRecommendationDto[] = finalCandidates.map(
        (profile) => ({
          id: profile.userId,
          displayName: profile.user.displayName,
          photoURL: profile.user.photoURL,
          age: calculateAge(profile.birthDate), // Calculate age again
        }),
      );
      this.logger.log(
        `Successfully generated ${recommendations.length} recommendations for user: ${currentUserId}`,
      );

      return recommendations;
    } catch (error) {
      // Phase 4: Finalization & Error Handling
      this.logger.error(
        `Failed to get homepage recommendations for user ${currentUserId}: ${error.message}`,
        error.stack,
      );
      if (error instanceof NotFoundException) {
        throw error; // Re-throw specific known exceptions
      }
      throw new InternalServerErrorException(
        "Failed to retrieve recommendations.",
      );
    }
  }

  // --- Private Helper Methods ---

  private _filterAndSortByGenderPreference(
    candidates: UserProfile[],
    preference: GenderPreference | null | undefined,
    targetCount: number,
  ): UserProfile[] {
    // Filter out null/undefined genders FIRST (PREFER_NOT_TO_SAY check removed as enum value is gone)
    const validGenderCandidates = candidates.filter(
      (candidate) => candidate.gender,
    );

    // Handle null or undefined preference - operate on the filtered list
    if (!preference || validGenderCandidates.length === 0) {
      return validGenderCandidates.slice(0, targetCount);
    }

    const preferredGroup: UserProfile[] = [];
    const fillGroup: UserProfile[] = [];

    // Iterate over the pre-filtered list
    validGenderCandidates.forEach((candidate) => {
      if (candidate.gender === Gender.OTHER) {
        fillGroup.push(candidate);
      } else if (
        (preference === GenderPreference.MALE &&
          candidate.gender === Gender.MALE) ||
        (preference === GenderPreference.FEMALE &&
          candidate.gender === Gender.FEMALE) ||
        (preference === GenderPreference.BOTH &&
          (candidate.gender === Gender.MALE ||
            candidate.gender === Gender.FEMALE))
      ) {
        preferredGroup.push(candidate);
      } else {
        // Include non-preferred MALE/FEMALE in fill group if preference is specific (M or F)
        if (preference !== GenderPreference.BOTH) {
          fillGroup.push(candidate);
        }
      }
    });

    this.logger.debug(
      `Gender filtering: Preferred=${preferredGroup.length}, Fill=${fillGroup.length}`,
    );

    const targetPreferredCount = Math.ceil(targetCount * 0.75);
    const selectedPreferred = preferredGroup.slice(0, targetPreferredCount);
    const neededFillCount = targetCount - selectedPreferred.length;
    const selectedFill = fillGroup.slice(0, neededFillCount);

    const finalSelection = [...selectedPreferred, ...selectedFill];
    this.logger.debug(
      `Final selection count: ${finalSelection.length} (Preferred: ${selectedPreferred.length}, Fill: ${selectedFill.length})`,
    );

    return finalSelection.slice(0, targetCount);
  }
}
