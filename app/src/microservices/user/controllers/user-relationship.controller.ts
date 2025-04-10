import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { User } from "../../auth/entities/user.entity";
import { UserRelationshipService } from "../services/user-relationship.service";
import { ConnectionRequestDto } from "../dto/connection-request.dto";
import { ConnectionResponseDto } from "../dto/connection-response.dto";
import { BlockUserDto } from "../dto/block-user.dto";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";

@ApiTags("User Connections")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("users/connections")
export class UserRelationshipController {
  constructor(
    private readonly userRelationshipService: UserRelationshipService,
  ) {}

  @Post()
  @ApiOperation({ summary: "Send a connection request to another user" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "The connection request has been successfully sent",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid request or relationship already exists",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Recipient user not found",
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "Free tier connection limit reached",
  })
  async sendConnectionRequest(
    @CurrentUser() user: User,
    @Body() connectionRequestDto: ConnectionRequestDto,
  ) {
    try {
      return await this.userRelationshipService.sendConnectionRequest(
        user.id,
        connectionRequestDto,
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get()
  @ApiOperation({ summary: "Get all connections (friends)" })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Number of items per page",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns the list of connections",
  })
  async getConnections(
    @CurrentUser() user: User,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.userRelationshipService.getConnections(user.id, page, limit);
  }

  @Get("pending")
  @ApiOperation({ summary: "Get all pending connection requests" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns the list of pending connection requests",
  })
  async getPendingRequests(@CurrentUser() user: User) {
    return this.userRelationshipService.getPendingRequests(user.id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Accept or decline a connection request" })
  @ApiParam({ name: "id", type: String, description: "Relationship ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The request has been processed",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid request or relationship not in pending state",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Relationship not found",
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "User does not have permission to respond to this request",
  })
  async respondToRequest(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() connectionResponseDto: ConnectionResponseDto,
  ) {
    // Ensure the response has the correct relationship ID
    connectionResponseDto.relationshipId = id;

    return this.userRelationshipService.respondToRequest(
      user.id,
      connectionResponseDto,
    );
  }

  @Post("block")
  @ApiOperation({ summary: "Block a user" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "The user has been successfully blocked",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid request",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "User not found",
  })
  async blockUser(
    @CurrentUser() user: User,
    @Body() blockUserDto: BlockUserDto,
  ) {
    return this.userRelationshipService.blockUser(user.id, blockUserDto);
  }

  @Delete("block/:userId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Unblock a user" })
  @ApiParam({ name: "userId", type: String, description: "User ID to unblock" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The user has been successfully unblocked",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid request or no block relationship found",
  })
  async unblockUser(
    @CurrentUser() user: User,
    @Param("userId", ParseUUIDPipe) targetUserId: string,
  ) {
    return this.userRelationshipService.unblockUser(user.id, targetUserId);
  }

  @Get("blocked")
  @ApiOperation({ summary: "Get all blocked users" })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Number of items per page",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns the list of blocked users",
  })
  async getBlockedUsers(
    @CurrentUser() user: User,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.userRelationshipService.getBlockedUsers(user.id, page, limit);
  }
}
