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
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
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
    @CurrentUser("id") userId: string,
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    const url = await this.eventImageService.uploadEventCoverImage(
      file,
      eventId,
      userId,
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
    @CurrentUser("id") userId: string,
  ): Promise<{ success: boolean }> {
    const success = await this.eventImageService.deleteEventCoverImage(
      eventId,
      userId,
    );
    return { success };
  }
}
