import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Delete,
  HttpStatus,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { UserImageService } from "../services/user-image.service";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { Request } from "express";
import { User } from "../../auth/entities/user.entity";

// Define interface for request with user
interface RequestWithUser extends Request {
  user?: User;
}

@ApiTags("User Images")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("users/me")
export class UserImageController {
  constructor(private readonly userImageService: UserImageService) {}

  @Post("profile-image")
  @ApiOperation({ summary: "Upload profile image" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "The profile image has been successfully uploaded",
    schema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          example: "http://localhost:3000/uploads/user/123_profile_abc.jpg",
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async uploadProfileImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: RequestWithUser,
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    if (!req.user) {
      throw new UnauthorizedException();
    }

    const url = await this.userImageService.uploadProfileImage(
      file,
      req.user.id,
    );
    return { url };
  }

  @Post("profile-cover")
  @ApiOperation({ summary: "Upload profile cover image" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "The profile cover image has been successfully uploaded",
    schema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          example: "http://localhost:3000/uploads/user/123_cover_abc.jpg",
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async uploadProfileCoverImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: RequestWithUser,
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    if (!req.user) {
      throw new UnauthorizedException();
    }

    const url = await this.userImageService.uploadProfileCoverImage(
      file,
      req.user.id,
    );
    return { url };
  }

  @Delete("profile-image")
  @ApiOperation({ summary: "Delete profile image" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The profile image has been successfully deleted",
    schema: {
      type: "object",
      properties: {
        success: {
          type: "boolean",
          example: true,
        },
      },
    },
  })
  async deleteProfileImage(
    @Req() req: RequestWithUser,
  ): Promise<{ success: boolean }> {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    const success = await this.userImageService.deleteProfileImage(req.user.id);
    return { success };
  }

  @Delete("profile-cover")
  @ApiOperation({ summary: "Delete profile cover image" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The profile cover image has been successfully deleted",
    schema: {
      type: "object",
      properties: {
        success: {
          type: "boolean",
          example: true,
        },
      },
    },
  })
  async deleteProfileCoverImage(
    @Req() req: RequestWithUser,
  ): Promise<{ success: boolean }> {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    const success = await this.userImageService.deleteProfileCoverImage(
      req.user.id,
    );
    return { success };
  }
}
