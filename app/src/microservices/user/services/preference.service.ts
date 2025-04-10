import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { UserPreferenceRepository } from "../repositories/user-preference.repository";
import { UpdatePreferencesDto } from "../dto/update-preferences.dto";

@Injectable()
export class PreferenceService {
  private readonly logger = new Logger(PreferenceService.name);

  constructor(
    private readonly preferenceRepository: UserPreferenceRepository,
  ) {}

  async getPreferences(userId: string) {
    try {
      return await this.preferenceRepository.findByUserId(userId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        // Create preferences if they don't exist yet
        return this.initPreferences(userId);
      }
      throw error;
    }
  }

  async initPreferences(userId: string) {
    this.logger.log(`Initializing preferences for user ${userId}`);
    return this.preferenceRepository.createPreference(userId);
  }

  async updatePreferences(
    userId: string,
    updatePreferencesDto: UpdatePreferencesDto,
  ) {
    let preferences;

    try {
      preferences = await this.preferenceRepository.findByUserId(userId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        preferences = await this.initPreferences(userId);
      } else {
        throw error;
      }
    }

    this.logger.log(`Updating preferences for user ${userId}`);

    return this.preferenceRepository.updatePreference(
      userId,
      updatePreferencesDto,
    );
  }
}
