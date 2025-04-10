import { Injectable, NotFoundException } from "@nestjs/common";
import { UserRepository } from "./repositories/user.repository";
import { ProfileService } from "./services/profile.service";

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly profileService: ProfileService,
  ) {}

  async getUserById(userId: string) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return user;
  }

  async getUserWithProfile(userId: string) {
    const user = await this.getUserById(userId);
    const profile = await this.profileService.getProfile(userId);

    return {
      ...user,
      profile,
    };
  }

  async searchUsers(query: string) {
    return this.userRepository.searchUsers(query);
  }
}
