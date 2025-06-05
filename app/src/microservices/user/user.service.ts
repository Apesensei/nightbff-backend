import { Injectable, NotFoundException } from "@nestjs/common";
import { UserRepository } from "./repositories/user.repository";
import { ProfileService } from "./services/profile.service";
import { User } from "../auth/entities/user.entity";
import { UserProfile } from "./entities/user-profile.entity";

/**
 * @summary Service providing core user-related operations.
 *
 * @description This service acts as an abstraction layer for retrieving
 * user data, including combining core user information (from AuthModule)
 * with extended profile details (from UserProfile entity).
 */
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly profileService: ProfileService,
  ) {}

  /**
   * @summary Retrieves a user by their ID.
   *
   * @description Fetches the core User entity from the database.
   * Throws NotFoundException if the user does not exist.
   *
   * @param {string} userId - The UUID of the user to retrieve.
   * @returns {Promise<User>} The User entity.
   * @throws {NotFoundException} If no user is found with the given ID.
   */
  async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return user;
  }

  /**
   * @summary Retrieves a user along with their associated profile.
   *
   * @description Fetches the core User entity and the corresponding UserProfile entity.
   * The profile will be null if it hasn't been created yet.
   *
   * @param {string} userId - The UUID of the user to retrieve.
   * @returns {Promise<{ user: User; profile: UserProfile | null }>} An object containing the User and potentially their UserProfile.
   * @throws {NotFoundException} If no user is found with the given ID.
   */
  async getUserWithProfile(
    userId: string,
  ): Promise<{ user: User; profile: UserProfile | null }> {
    const result = await this.userRepository.findUserWithProfile(userId);
    if (!result) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return result;
  }

  /**
   * @summary Searches for users based on a query string.
   *
   * @description Performs a search (e.g., by username or display name) for users.
   * The exact search logic is implemented in the UserRepository.
   *
   * @param {string} query - The search query string.
   * @returns {Promise<User[]>} An array of matching User entities.
   */
  async searchUsers(query: string): Promise<User[]> {
    return this.userRepository.searchUsers(query);
  }

  /**
   * @summary Updates the user's location coordinates.
   *
   * @description Updates the user's latitude and longitude in the database.
   * Uses the existing UserRepository updateUserLocation method.
   *
   * @param {string} userId - The UUID of the user to update.
   * @param {number} latitude - The user's latitude coordinate.
   * @param {number} longitude - The user's longitude coordinate.
   * @returns {Promise<User>} The updated User entity.
   * @throws {NotFoundException} If no user is found with the given ID.
   */
  async updateUserLocation(
    userId: string,
    latitude: number,
    longitude: number,
  ): Promise<User> {
    return this.userRepository.updateUserLocation(userId, latitude, longitude);
  }
}
