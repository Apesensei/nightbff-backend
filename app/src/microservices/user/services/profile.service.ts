import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ProfileRepository } from "../repositories/profile.repository";
import { UpdateProfileDto } from "../dto/update-profile.dto";

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(private readonly profileRepository: ProfileRepository) {}

  async getProfile(userId: string) {
    try {
      return await this.profileRepository.findByUserId(userId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        // Create a profile if it doesn't exist yet
        return this.initProfile(userId);
      }
      throw error;
    }
  }

  async initProfile(userId: string) {
    this.logger.log(`Initializing profile for user ${userId}`);
    return this.profileRepository.createProfile(userId);
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    try {
      await this.profileRepository.findByUserId(userId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        await this.initProfile(userId);
      } else {
        throw error;
      }
    }

    this.logger.log(`Updating profile for user ${userId}`);

    // Convert the birthday string to a Date object if provided
    const profileData: any = { ...updateProfileDto };
    if (updateProfileDto.birthday) {
      profileData.birthday = new Date(updateProfileDto.birthday);
    }

    return this.profileRepository.updateProfile(userId, profileData);
  }
}
