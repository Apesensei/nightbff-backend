import { Controller, Get, Put, Body, Param, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UserService } from "./user.service";
import { ProfileService } from "./services/profile.service";
import { PreferenceService } from "./services/preference.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UpdatePreferencesDto } from "./dto/update-preferences.dto";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../auth/entities/user.entity";

@Controller("users")
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly profileService: ProfileService,
    private readonly preferenceService: PreferenceService,
  ) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentUser() user: User) {
    return user;
  }

  @Get("me/profile")
  @UseGuards(JwtAuthGuard)
  async getCurrentUserProfile(@CurrentUser() user: User) {
    return this.profileService.getProfile(user.id);
  }

  @Put("me/profile")
  @UseGuards(JwtAuthGuard)
  async updateCurrentUserProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(user.id, updateProfileDto);
  }

  @Get("me/preferences")
  @UseGuards(JwtAuthGuard)
  async getCurrentUserPreferences(@CurrentUser() user: User) {
    return this.preferenceService.getPreferences(user.id);
  }

  @Put("me/preferences")
  @UseGuards(JwtAuthGuard)
  async updateCurrentUserPreferences(
    @CurrentUser() user: User,
    @Body() updatePreferencesDto: UpdatePreferencesDto,
  ) {
    return this.preferenceService.updatePreferences(
      user.id,
      updatePreferencesDto,
    );
  }

  @Get(":id")
  async getUserById(@Param("id") id: string) {
    return this.userService.getUserById(id);
  }

  @Get(":id/profile")
  async getUserProfile(@Param("id") id: string) {
    const profile = await this.profileService.getProfile(id);
    if (!profile.isPublic) {
      return { isPublic: false };
    }
    return profile;
  }
}
