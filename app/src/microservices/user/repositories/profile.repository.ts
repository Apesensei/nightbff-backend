import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Profile } from "../entities/profile.entity";

@Injectable()
export class ProfileRepository {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
  ) {}

  async createProfile(userId: string): Promise<Profile> {
    const profile = this.profileRepository.create({ userId });
    return this.profileRepository.save(profile);
  }

  async findByUserId(userId: string): Promise<Profile> {
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
    profileData: Partial<Profile>,
  ): Promise<Profile> {
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
}
