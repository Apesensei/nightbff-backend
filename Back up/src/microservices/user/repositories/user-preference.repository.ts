import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserPreference } from "../entities/user-preference.entity";

@Injectable()
export class UserPreferenceRepository {
  constructor(
    @InjectRepository(UserPreference)
    private readonly userPreferenceRepository: Repository<UserPreference>,
  ) {}

  async createPreference(userId: string): Promise<UserPreference> {
    const preference = this.userPreferenceRepository.create({ userId });
    return this.userPreferenceRepository.save(preference);
  }

  async findByUserId(userId: string): Promise<UserPreference> {
    const preference = await this.userPreferenceRepository.findOne({
      where: { userId },
    });

    if (!preference) {
      throw new NotFoundException(
        `Preferences for user with ID ${userId} not found`,
      );
    }

    return preference;
  }

  async updatePreference(
    userId: string,
    preferenceData: Partial<UserPreference>,
  ): Promise<UserPreference> {
    const preference = await this.findByUserId(userId);
    const updatedPreference = this.userPreferenceRepository.merge(
      preference,
      preferenceData,
    );
    return this.userPreferenceRepository.save(updatedPreference);
  }

  async exists(userId: string): Promise<boolean> {
    const count = await this.userPreferenceRepository.count({
      where: { userId },
    });
    return count > 0;
  }
}
