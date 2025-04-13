import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../../auth/entities/user.entity";
import { UserProfile } from "../entities/user-profile.entity";
import {
  UserRelationship,
  RelationshipType,
} from "../entities/user-relationship.entity";

interface NearbyUsersParams {
  latitude: number;
  longitude: number;
  radiusInKm?: number;
  excludeUserIds?: string[];
  limit?: number;
  offset?: number;
}

// Extended user with distance information
export interface UserWithDistance extends User {
  distance: number;
}

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
    @InjectRepository(UserRelationship)
    private readonly userRelationshipRepository: Repository<UserRelationship>,
  ) {}

  async findUserWithProfile(
    userId: string,
  ): Promise<{ user: User; profile: UserProfile | null } | null> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        return null;
      }

      const profile = await this.userProfileRepository.findOne({
        where: { userId: userId },
      });

      return { user, profile };
    } catch (error) {
      throw new InternalServerErrorException(
        `Error fetching user with profile: ${error.message}`,
      );
    }
  }

  async createUserProfile(
    userId: string,
    profileData: Partial<UserProfile>,
  ): Promise<UserProfile> {
    try {
      const userExists = await this.userRepository.existsBy({ id: userId });

      if (!userExists) {
        throw new NotFoundException(
          `Cannot create profile for non-existent user ${userId}`,
        );
      }

      const profile = this.userProfileRepository.create({
        userId,
        ...profileData,
      });

      return await this.userProfileRepository.save(profile);
    } catch (error) {
      throw new InternalServerErrorException(
        `Error creating user profile: ${error.message}`,
      );
    }
  }

  async findById(userId: string): Promise<User | null> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        return null;
      }

      return user;
    } catch (error) {
      throw new InternalServerErrorException(
        `Error fetching user: ${error.message}`,
      );
    }
  }

  async searchUsers(query: string): Promise<User[]> {
    try {
      return this.userRepository
        .createQueryBuilder("user")
        .where("user.username ILIKE :query OR user.display_name ILIKE :query", {
          query: `%${query}%`,
        })
        .take(20)
        .getMany();
    } catch (error) {
      throw new InternalServerErrorException(
        `Error searching users: ${error.message}`,
      );
    }
  }

  async updateUserLocation(
    userId: string,
    lat: number,
    lng: number,
  ): Promise<User> {
    try {
      const user = await this.findById(userId);

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      user.locationLatitude = lat;
      user.locationLongitude = lng;

      return this.userRepository.save(user);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error updating user location: ${error.message}`,
      );
    }
  }

  async findNearbyUsers(
    params: NearbyUsersParams,
    currentUserId: string,
  ): Promise<[UserWithDistance[], number]> {
    try {
      const {
        latitude,
        longitude,
        radiusInKm = 5,
        excludeUserIds = [],
        limit = 20,
        offset = 0,
      } = params;

      // Add current user to excluded ids
      const excludedIds = [...excludeUserIds, currentUserId];

      // Get blocked relationships (users who blocked or were blocked by current user)
      const blockedRelationships = await this.userRelationshipRepository.find({
        where: [
          { requesterId: currentUserId, type: RelationshipType.BLOCKED },
          { recipientId: currentUserId, type: RelationshipType.BLOCKED },
        ],
      });

      // Extract user IDs from blocked relationships
      const blockedUserIds = blockedRelationships.map((rel) =>
        rel.requesterId === currentUserId ? rel.recipientId : rel.requesterId,
      );

      // Add blocked users to excluded ids
      excludedIds.push(...blockedUserIds);

      // Calculate distance using PostgreSQL's ST_Distance_Sphere
      const queryBuilder = this.userRepository
        .createQueryBuilder("user")
        .select("user.*")
        .addSelect(
          `ST_Distance_Sphere(
          ST_MakePoint(user.location_longitude, user.location_latitude),
          ST_MakePoint(:longitude, :latitude)
        ) as distance`,
          "distance",
        )
        .where("user.id NOT IN (:...excludedIds)", { excludedIds })
        .andWhere("user.location_latitude IS NOT NULL")
        .andWhere("user.location_longitude IS NOT NULL")
        .andWhere(
          `ST_Distance_Sphere(
          ST_MakePoint(user.location_longitude, user.location_latitude),
          ST_MakePoint(:longitude, :latitude)
        ) <= :radius`,
          {
            latitude,
            longitude,
            radius: radiusInKm * 1000, // Convert km to meters
          },
        )
        .orderBy("distance", "ASC")
        .limit(limit)
        .offset(offset);

      const users = await queryBuilder.getRawAndEntities();
      const count = await queryBuilder.getCount();

      // Attach distance to user entities
      const usersWithDistance = users.entities.map((user, index) => {
        const distanceInMeters = users.raw[index].distance;
        const distanceInKm = Math.round((distanceInMeters / 1000) * 10) / 10; // Round to 1 decimal place
        return {
          ...user,
          distance: distanceInKm,
        } as UserWithDistance;
      });

      return [usersWithDistance, count];
    } catch (error) {
      throw new InternalServerErrorException(
        `Error finding nearby users: ${error.message}`,
      );
    }
  }

  async findActiveNearbyUsers(
    params: NearbyUsersParams,
    currentUserId: string,
    activeWithinMinutes = 30,
  ): Promise<[UserWithDistance[], number]> {
    try {
      // Calculate the cutoff time for active users
      const activeAfter = new Date();
      activeAfter.setMinutes(activeAfter.getMinutes() - activeWithinMinutes);

      const {
        latitude,
        longitude,
        radiusInKm = 5,
        excludeUserIds = [],
        limit = 20,
        offset = 0,
      } = params;

      // Add current user to excluded ids
      const excludedIds = [...excludeUserIds, currentUserId];

      // Get blocked relationships
      const blockedRelationships = await this.userRelationshipRepository.find({
        where: [
          { requesterId: currentUserId, type: RelationshipType.BLOCKED },
          { recipientId: currentUserId, type: RelationshipType.BLOCKED },
        ],
      });

      // Extract user IDs from blocked relationships
      const blockedUserIds = blockedRelationships.map((rel) =>
        rel.requesterId === currentUserId ? rel.recipientId : rel.requesterId,
      );

      // Add blocked users to excluded ids
      excludedIds.push(...blockedUserIds);

      // Calculate distance using PostgreSQL's ST_Distance_Sphere
      const queryBuilder = this.userRepository
        .createQueryBuilder("user")
        .select("user.*")
        .addSelect(
          `ST_Distance_Sphere(
          ST_MakePoint(user.location_longitude, user.location_latitude),
          ST_MakePoint(:longitude, :latitude)
        ) as distance`,
          "distance",
        )
        .where("user.id NOT IN (:...excludedIds)", { excludedIds })
        .andWhere("user.location_latitude IS NOT NULL")
        .andWhere("user.location_longitude IS NOT NULL")
        .andWhere("user.last_active >= :activeAfter", { activeAfter })
        .andWhere(
          `ST_Distance_Sphere(
          ST_MakePoint(user.location_longitude, user.location_latitude),
          ST_MakePoint(:longitude, :latitude)
        ) <= :radius`,
          {
            latitude,
            longitude,
            radius: radiusInKm * 1000, // Convert km to meters
          },
        )
        .orderBy("distance", "ASC")
        .limit(limit)
        .offset(offset);

      const users = await queryBuilder.getRawAndEntities();
      const count = await queryBuilder.getCount();

      // Attach distance to user entities
      const usersWithDistance = users.entities.map((user, index) => {
        const distanceInMeters = users.raw[index].distance;
        const distanceInKm = Math.round((distanceInMeters / 1000) * 10) / 10; // Round to 1 decimal place
        return {
          ...user,
          distance: distanceInKm,
        } as UserWithDistance;
      });

      return [usersWithDistance, count];
    } catch (error) {
      throw new InternalServerErrorException(
        `Error finding active nearby users: ${error.message}`,
      );
    }
  }
}
