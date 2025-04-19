import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull, Not, In } from "typeorm";
import { UserProfile } from "../entities/user-profile.entity";

const DEFAULT_FETCH_LIMIT = 100;

@Injectable()
export class ProfileRepository {
  constructor(
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
  ) {}

  async createProfile(userId: string): Promise<UserProfile> {
    const profile = this.profileRepository.create({ userId });
    return this.profileRepository.save(profile);
  }

  async findByUserId(userId: string): Promise<UserProfile> {
    const profile = await this.profileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException(
        `Profile for user with ID ${userId} not found`,
      );
    }

    return profile;
  }

  async updateProfile(
    userId: string,
    profileData: Partial<UserProfile>,
  ): Promise<UserProfile> {
    const profile = await this.findByUserId(userId);
    const updatedProfile = this.profileRepository.merge(profile, profileData);
    return this.profileRepository.save(updatedProfile);
  }

  async exists(userId: string): Promise<boolean> {
    const count = await this.profileRepository.count({
      where: { userId },
    });
    return count > 0;
  }

  async findMostRecentActiveUserProfiles(options: {
    fetchLimit?: number;
    excludeUserIds: string[];
  }): Promise<UserProfile[]> {
    const { fetchLimit = DEFAULT_FETCH_LIMIT, excludeUserIds } = options;

    const query = this.profileRepository
      .createQueryBuilder("userProfile")
      .select([
        "userProfile.userId",
        "userProfile.gender",
        "userProfile.lastActiveAt",
        "userProfile.birthDate",
        "user.displayName",
        "user.photoURL",
      ])
      .innerJoin("userProfile.user", "user")
      .where({ lastActiveAt: Not(IsNull()) });

    if (excludeUserIds && excludeUserIds.length > 0) {
      query.andWhere("userProfile.userId NOT IN (:...excludeUserIds)", {
        excludeUserIds,
      });
    }

    query.orderBy("userProfile.lastActiveAt", "DESC").limit(fetchLimit);

    return query.getMany();
  }
}
