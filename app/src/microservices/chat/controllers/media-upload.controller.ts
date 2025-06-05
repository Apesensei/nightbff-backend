import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpStatus,
  Delete,
  Param,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { MediaUploadService } from "../services/media-upload.service";
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

@ApiTags("Chat Media")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("chat/media")
export class MediaUploadController {
  constructor(private readonly mediaUploadService: MediaUploadService) {}

  @Post("upload")
  @ApiOperation({ summary: "Upload media file for chat message" })
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
    description: "The file has been successfully uploaded",
    schema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          example: "http://localhost:3000/uploads/chat/123_abc.jpg",
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: RequestWithUser,
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    if (!req.user) {
      throw new UnauthorizedException();
    }

    const url = await this.mediaUploadService.uploadFile(file, req.user.id);
    return { url };
  }

  @Delete(":filename")
  @ApiOperation({ summary: "Delete uploaded media file" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The file has been successfully deleted",
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
  async deleteFile(
    @Param("filename") filename: string,
    @Req() req: RequestWithUser,
  ): Promise<{ success: boolean }> {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    // Construct URL from filename
    // This is a simple approach; in a real app, you might want to store file metadata in a database
    const baseUrl = process.env.API_URL || "http://localhost:3000";
    const fileUrl = `${baseUrl}/uploads/chat/${filename}`;

    // Validate that the file belongs to the user before deletion
    // For this example, we're using a filename pattern that includes the user ID
    if (!filename.startsWith(req.user.id)) {
      throw new BadRequestException("You can only delete your own files");
    }

    const success = await this.mediaUploadService.deleteFile(fileUrl);
    return { success };
  }
}
