import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
  ParseFloatPipe,
  DefaultValuePipe,
  ParseIntPipe,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { User } from "../../auth/entities/user.entity";
import {
  UserDiscoveryService,
  ViewerWithTimestamp,
} from "../services/user-discovery.service";
import { UserWithDistance } from "../repositories/user.repository";

@Controller("users/discovery")
@UseGuards(JwtAuthGuard)
export class UserDiscoveryController {
  constructor(private readonly userDiscoveryService: UserDiscoveryService) {}

  @Get("nearby")
  async findNearbyUsers(
    @CurrentUser() user: User,
    @Query("latitude", ParseFloatPipe) latitude: number,
    @Query("longitude", ParseFloatPipe) longitude: number,
    @Query("radiusInKm", new DefaultValuePipe(5), ParseFloatPipe)
    radiusInKm: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("offset", new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query("activeOnly", new DefaultValuePipe(false)) activeOnly: boolean,
    @Query("activeWithinMinutes", new DefaultValuePipe(30), ParseIntPipe)
    activeWithinMinutes: number,
  ): Promise<{ users: UserWithDistance[]; total: number }> {
    try {
      return this.userDiscoveryService.findNearbyUsers(
        user.id,
        latitude,
        longitude,
        {
          radiusInKm,
          limit,
          offset,
          activeOnly,
          activeWithinMinutes,
        },
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("recommended")
  async getRecommendedUsers(
    @CurrentUser() user: User,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("offset", new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<{ users: UserWithDistance[]; total: number }> {
    try {
      return this.userDiscoveryService.getRecommendedUsers(user.id, {
        limit,
        offset,
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("profile-viewers")
  async getProfileViewers(
    @CurrentUser() user: User,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("offset", new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query("daysBack", new DefaultValuePipe(30), ParseIntPipe) daysBack: number,
  ): Promise<{ users: ViewerWithTimestamp[]; total: number }> {
    try {
      return this.userDiscoveryService.getProfileViewers(user.id, {
        limit,
        offset,
        daysBack,
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
