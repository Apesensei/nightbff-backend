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

      // Convert radius to meters
      const radiusInMeters = radiusInKm * 1000;

      // Build excluded IDs placeholders for SQL (safe from injection)
      const excludedIdsPlaceholders = excludedIds
        .map((_, index) => `$${index + 4}`)
        .join(", ");

      // Raw SQL query using proven PostGIS pattern from event repository
      const query = `
        SELECT 
          u.*,
          ST_Distance(
            geography(ST_SetSRID(ST_MakePoint(u.location_longitude, u.location_latitude), 4326)),
            geography(ST_SetSRID(ST_MakePoint($1, $2), 4326))
          ) as distance_meters
        FROM users u
        WHERE u.id NOT IN (${excludedIdsPlaceholders})
          AND u.location_latitude IS NOT NULL
          AND u.location_longitude IS NOT NULL
          AND ST_DWithin(
            geography(ST_SetSRID(ST_MakePoint(u.location_longitude, u.location_latitude), 4326)),
            geography(ST_SetSRID(ST_MakePoint($1, $2), 4326)),
            $3
          )
        ORDER BY distance_meters ASC
        LIMIT $${excludedIds.length + 4} OFFSET $${excludedIds.length + 5}
      `;

      // Count query for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM users u
        WHERE u.id NOT IN (${excludedIdsPlaceholders})
          AND u.location_latitude IS NOT NULL
          AND u.location_longitude IS NOT NULL
          AND ST_DWithin(
            geography(ST_SetSRID(ST_MakePoint(u.location_longitude, u.location_latitude), 4326)),
            geography(ST_SetSRID(ST_MakePoint($1, $2), 4326)),
            $3
          )
      `;

      // Execute queries with parameters
      const queryParams = [
        longitude,
        latitude,
        radiusInMeters,
        ...excludedIds,
        limit,
        offset,
      ];
      const countParams = [longitude, latitude, radiusInMeters, ...excludedIds];

      const [rawUsers, countResult] = await Promise.all([
        this.userRepository.manager.query(query, queryParams),
        this.userRepository.manager.query(countQuery, countParams),
      ]);

      // Map raw results to User entities with distance
      const usersWithDistance: UserWithDistance[] = rawUsers.map(
        (rawUser: any) => {
          // Create User entity instance
          const user = new User();
          Object.assign(user, {
            id: rawUser.id,
            email: rawUser.email,
            username: rawUser.username,
            displayName: rawUser.display_name,
            photoURL: rawUser.photo_url,
            bio: rawUser.bio,
            interests: rawUser.interests,
            isVerified: rawUser.is_verified,
            isPremium: rawUser.is_premium,
            isAgeVerified: rawUser.is_age_verified,
            isOnline: rawUser.is_online,
            locationLatitude: rawUser.location_latitude,
            locationLongitude: rawUser.location_longitude,
            status: rawUser.status,
            roles: rawUser.roles,
            createdAt: rawUser.created_at,
            updatedAt: rawUser.updated_at,
          });

          // Add distance in kilometers, rounded to 1 decimal place
          const distanceInKm =
            Math.round((rawUser.distance_meters / 1000) * 10) / 10;

          return {
            ...user,
            distance: distanceInKm,
          } as UserWithDistance;
        },
      );

      const count = parseInt(countResult[0].total);

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

      // Convert radius to meters
      const radiusInMeters = radiusInKm * 1000;

      // Build excluded IDs placeholders for SQL (safe from injection)
      const excludedIdsPlaceholders = excludedIds
        .map((_, index) => `$${index + 5}`)
        .join(", ");

      // Raw SQL query with additional last_active filter
      const query = `
        SELECT 
          u.*,
          ST_Distance(
            geography(ST_SetSRID(ST_MakePoint(u.location_longitude, u.location_latitude), 4326)),
            geography(ST_SetSRID(ST_MakePoint($1, $2), 4326))
          ) as distance_meters
        FROM users u
        WHERE u.id NOT IN (${excludedIdsPlaceholders})
          AND u.location_latitude IS NOT NULL
          AND u.location_longitude IS NOT NULL
          AND u.last_active >= $4
          AND ST_DWithin(
            geography(ST_SetSRID(ST_MakePoint(u.location_longitude, u.location_latitude), 4326)),
            geography(ST_SetSRID(ST_MakePoint($1, $2), 4326)),
            $3
          )
        ORDER BY distance_meters ASC
        LIMIT $${excludedIds.length + 5} OFFSET $${excludedIds.length + 6}
      `;

      // Count query for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM users u
        WHERE u.id NOT IN (${excludedIdsPlaceholders})
          AND u.location_latitude IS NOT NULL
          AND u.location_longitude IS NOT NULL
          AND u.last_active >= $4
          AND ST_DWithin(
            geography(ST_SetSRID(ST_MakePoint(u.location_longitude, u.location_latitude), 4326)),
            geography(ST_SetSRID(ST_MakePoint($1, $2), 4326)),
            $3
          )
      `;

      // Execute queries with parameters
      const queryParams = [
        longitude,
        latitude,
        radiusInMeters,
        activeAfter,
        ...excludedIds,
        limit,
        offset,
      ];
      const countParams = [
        longitude,
        latitude,
        radiusInMeters,
        activeAfter,
        ...excludedIds,
      ];

      const [rawUsers, countResult] = await Promise.all([
        this.userRepository.manager.query(query, queryParams),
        this.userRepository.manager.query(countQuery, countParams),
      ]);

      // Map raw results to User entities with distance
      const usersWithDistance: UserWithDistance[] = rawUsers.map(
        (rawUser: any) => {
          // Create User entity instance
          const user = new User();
          Object.assign(user, {
            id: rawUser.id,
            email: rawUser.email,
            username: rawUser.username,
            displayName: rawUser.display_name,
            photoURL: rawUser.photo_url,
            bio: rawUser.bio,
            interests: rawUser.interests,
            isVerified: rawUser.is_verified,
            isPremium: rawUser.is_premium,
            isAgeVerified: rawUser.is_age_verified,
            isOnline: rawUser.is_online,
            locationLatitude: rawUser.location_latitude,
            locationLongitude: rawUser.location_longitude,
            status: rawUser.status,
            roles: rawUser.roles,
            createdAt: rawUser.created_at,
            updatedAt: rawUser.updated_at,
          });

          // Add distance in kilometers, rounded to 1 decimal place
          const distanceInKm =
            Math.round((rawUser.distance_meters / 1000) * 10) / 10;

          return {
            ...user,
            distance: distanceInKm,
          } as UserWithDistance;
        },
      );

      const count = parseInt(countResult[0].total);

      return [usersWithDistance, count];
    } catch (error) {
      throw new InternalServerErrorException(
        `Error finding active nearby users: ${error.message}`,
      );
    }
  }
}
