import {
  Controller,
  Post,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Delete,
  Patch,
  HttpStatus,
  Body,
  Get,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { VenueImageService, DeviceType } from "../services/venue-image.service";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiHeader,
} from "@nestjs/swagger";
import { Request, Response } from "express";

class PhotoCaptionDto {
  caption?: string;
}

@ApiTags("Venue Images")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("venues")
export class VenueImageController {
  constructor(private readonly venueImageService: VenueImageService) {}

  @Post(":id/photos")
  @ApiOperation({ summary: "Upload a venue photo" })
  @ApiParam({ name: "id", description: "Venue ID" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
        caption: {
          type: "string",
          description: "Optional caption for the photo",
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "The venue photo has been successfully uploaded",
    schema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          example: "http://localhost:3000/uploads/venue/123_photo_abc.jpg",
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async uploadVenuePhoto(
    @Param("id") venueId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() photoCaptionDto: PhotoCaptionDto,
    @CurrentUser() user: any,
  ): Promise<Record<string, any>> {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    return await this.venueImageService.uploadVenuePhoto(
      file,
      venueId,
      user,
      photoCaptionDto.caption,
    );
  }

  @Get(":id/photos/optimized")
  @ApiOperation({ summary: "Get optimized photos for different device types" })
  @ApiParam({ name: "id", description: "Venue ID" })
  @ApiQuery({
    name: "deviceType",
    enum: ["mobile", "tablet", "desktop"],
    required: false,
    description: "Type of device requesting the photos",
  })
  @ApiQuery({
    name: "context",
    required: false,
    description: "Context of display (e.g., list, detail, full)",
  })
  @ApiHeader({
    name: "If-None-Match",
    required: false,
    description: "ETag from previous request for conditional fetching",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Optimized photos for the specified device type",
    schema: {
      type: "object",
      properties: {
        photos: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              url: { type: "string" },
              caption: { type: "string" },
              isPrimary: { type: "boolean" },
              order: { type: "number" },
              etag: { type: "string" },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_MODIFIED,
    description: "Content has not changed since last request (based on ETag)",
  })
  async getOptimizedPhotos(
    @Param("id") venueId: string,
    @Query("deviceType") deviceType: DeviceType = "mobile",
    @Query("context") context: string = "list",
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const ifNoneMatch = req.header("If-None-Match");

    const result = await this.venueImageService.getOptimizedPhotos(
      venueId,
      deviceType,
      context,
      ifNoneMatch,
    );

    // If content hasn't changed, return 304 Not Modified
    if (result.status === 304) {
      res.status(HttpStatus.NOT_MODIFIED).send();
      return;
    }

    // Generate ETag from the collection
    const etagValue = `"${
      result.photos.length > 0
        ? result.photos[0].etag.substring(0, 8) + "-" + result.photos.length
        : "empty"
    }"`;

    // Set ETag header and return photos
    res.setHeader("ETag", etagValue);
    res.status(HttpStatus.OK).json({ photos: result.photos });
  }

  @Delete(":id/photos/:photoId")
  @ApiOperation({ summary: "Delete a venue photo" })
  @ApiParam({ name: "id", description: "Venue ID" })
  @ApiParam({ name: "photoId", description: "Photo ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The venue photo has been successfully deleted",
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
  async deleteVenuePhoto(
    @Param("id") venueId: string,
    @Param("photoId") photoId: string,
    @CurrentUser() user: any,
  ): Promise<{ success: boolean }> {
    const success = await this.venueImageService.deleteVenuePhoto(
      photoId,
      user,
    );
    return { success };
  }

  @Patch(":id/photos/:photoId/primary")
  @ApiOperation({ summary: "Set a photo as primary for the venue" })
  @ApiParam({ name: "id", description: "Venue ID" })
  @ApiParam({ name: "photoId", description: "Photo ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The venue photo has been successfully set as primary",
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
  async setPrimaryPhoto(
    @Param("id") venueId: string,
    @Param("photoId") photoId: string,
    @CurrentUser() user: any,
  ): Promise<{ success: boolean }> {
    const success = await this.venueImageService.setPrimaryPhoto(
      photoId,
      venueId,
      user,
    );
    return { success };
  }

  @Patch(":id/photos/:photoId/approve")
  @ApiOperation({ summary: "Approve a venue photo" })
  @ApiParam({ name: "id", description: "Venue ID" })
  @ApiParam({ name: "photoId", description: "Photo ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The venue photo has been successfully approved",
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
  async approvePhoto(
    @Param("id") venueId: string,
    @Param("photoId") photoId: string,
    @CurrentUser() user: any,
  ): Promise<{ success: boolean }> {
    const success = await this.venueImageService.approvePhoto(photoId, user);
    return { success };
  }

  @Post(":id/photos/bulk-approve")
  @ApiOperation({ summary: "Bulk approve multiple photos" })
  @ApiParam({ name: "id", description: "Venue ID" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        photoIds: {
          type: "array",
          items: {
            type: "string",
          },
          description: "Array of photo IDs to approve",
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The venue photos have been successfully approved",
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
  async bulkApprovePhotos(
    @Param("id") venueId: string,
    @Body() body: { photoIds: string[] },
    @CurrentUser() user: any,
  ): Promise<{ success: boolean }> {
    const success = await this.venueImageService.bulkApprovePhotos(
      body.photoIds,
      user,
    );
    return { success };
  }
}
