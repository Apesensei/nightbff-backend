import {
  Controller,
  Post,
  Param,
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
import { EventImageService } from "../services/event-image.service";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from "@nestjs/swagger";
import { Request } from "express";
import { User } from "../../auth/entities/user.entity";

// Define interface for request with user
interface RequestWithUser extends Request {
  user?: User;
}

@ApiTags("Event Images")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("events")
export class EventImageController {
  constructor(private readonly eventImageService: EventImageService) {}

  @Post(":id/cover-image")
  @ApiOperation({ summary: "Upload event cover image" })
  @ApiParam({ name: "id", description: "Event ID" })
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
    description: "The event cover image has been successfully uploaded",
    schema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          example: "http://localhost:3000/uploads/event/123_cover_abc.jpg",
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async uploadEventCoverImage(
    @Param("id") eventId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: RequestWithUser,
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    if (!req.user) {
      throw new UnauthorizedException();
    }

    const url = await this.eventImageService.uploadEventCoverImage(
      file,
      eventId,
      req.user.id,
    );
    return { url };
  }

  @Delete(":id/cover-image")
  @ApiOperation({ summary: "Delete event cover image" })
  @ApiParam({ name: "id", description: "Event ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The event cover image has been successfully deleted",
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
  async deleteEventCoverImage(
    @Param("id") eventId: string,
    @Req() req: RequestWithUser,
  ): Promise<{ success: boolean }> {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    const success = await this.eventImageService.deleteEventCoverImage(
      eventId,
      req.user.id,
    );
    return { success };
  }
}
