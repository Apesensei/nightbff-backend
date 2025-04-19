import { Controller, Get, Put, Body, Param, UseGuards, HttpStatus } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UserService } from "./user.service";
import { ProfileService } from "./services/profile.service";
import { PreferenceService } from "./services/preference.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UpdatePreferencesDto } from "./dto/update-preferences.dto";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../auth/entities/user.entity";
import { UserProfile } from "./entities/user-profile.entity";
import { UserPreference } from "./entities/user-preference.entity";

@ApiTags('User Profile & Preferences')
@ApiBearerAuth()
@Controller("users")
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly profileService: ProfileService,
    private readonly preferenceService: PreferenceService,
  ) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get current authenticated user's basic info" })
  @ApiResponse({ status: HttpStatus.OK, description: "Current user data", type: User })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  async getCurrentUser(@CurrentUser() user: User): Promise<User> {
    return user;
  }

  @Get("me/profile")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get current authenticated user's profile" })
  @ApiResponse({ status: HttpStatus.OK, description: "User profile data", type: UserProfile })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Profile not found" })
  async getCurrentUserProfile(@CurrentUser() user: User): Promise<UserProfile> {
    return this.profileService.getProfile(user.id);
  }

  @Put("me/profile")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Update current authenticated user's profile" })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({ status: HttpStatus.OK, description: "Profile updated successfully", type: UserProfile })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: "Invalid input data" })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  async updateCurrentUserProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<UserProfile> {
    return this.profileService.updateProfile(user.id, updateProfileDto);
  }

  @Get("me/preferences")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get current authenticated user's preferences" })
  @ApiResponse({ status: HttpStatus.OK, description: "User preferences", type: UserPreference })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Preferences not found" })
  async getCurrentUserPreferences(@CurrentUser() user: User): Promise<UserPreference> {
    return this.preferenceService.getPreferences(user.id);
  }

  @Put("me/preferences")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Update current authenticated user's preferences" })
  @ApiBody({ type: UpdatePreferencesDto })
  @ApiResponse({ status: HttpStatus.OK, description: "Preferences updated successfully", type: UserPreference })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: "Invalid input data" })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  async updateCurrentUserPreferences(
    @CurrentUser() user: User,
    @Body() updatePreferencesDto: UpdatePreferencesDto,
  ): Promise<UserPreference> {
    return this.preferenceService.updatePreferences(
      user.id,
      updatePreferencesDto,
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Get basic user info by ID" })
  @ApiParam({ name: "id", description: "User ID", type: String })
  @ApiResponse({ status: HttpStatus.OK, description: "User data", type: User })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "User not found" })
  async getUserById(@Param("id") id: string): Promise<User> {
    return this.userService.getUserById(id);
  }

  @Get(":id/profile")
  @ApiOperation({ summary: "Get public user profile by ID" })
  @ApiParam({ name: "id", description: "User ID", type: String })
  @ApiResponse({ status: HttpStatus.OK, description: "Public user profile or indication of private profile", type: UserProfile })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "User/Profile not found" })
  async getUserProfile(@Param("id") id: string): Promise<Partial<UserProfile>> {
    const profile = await this.profileService.getProfile(id);
    if (!profile.isPublic) {
      return { id: profile.id, isPublic: false };
    }
    return profile;
  }
}
