import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Patch,
  Request,
  ParseUUIDPipe,
  ParseIntPipe,
  Logger,
  Header,
  Headers,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiHeader,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { UserRole } from "../../auth/entities/user.entity";
import { VenueService } from "../services/venue.service";
import { VenueImageService } from "../services/venue-image.service";
import { VenuePhoto } from "../entities/venue-photo.entity";
import { AdminVenueUpdateDto } from "../dto/admin-venue-update.dto";
import { AdminVenueResponseDto } from "../dto/admin-venue-response.dto";
import {
  AdminBulkApprovePhotosDto,
  AdminPhotoOrderDto,
  AdminSetPrimaryPhotoDto,
  AdminPhotoUploadDto,
} from "../dto/admin-photo-management.dto";
import * as crypto from "crypto";

@ApiTags("Admin Venue Management")
@Controller("admin/venues")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class VenueAdminController {
  private readonly logger = new Logger(VenueAdminController.name);

  constructor(
    private readonly venueService: VenueService,
    private readonly venueImageService: VenueImageService,
  ) {}

  @Get("with-overrides")
  @ApiOperation({ summary: "Get venues with admin overrides" })
  @ApiResponse({
    status: 200,
    description: "List of venues with admin overrides",
  })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "offset", required: false, type: Number })
  @ApiHeader({
    name: "If-None-Match",
    required: false,
    description: "ETag for conditional requests",
  })
  @Header("Cache-Control", "private, max-age=300")
  async getVenuesWithOverrides(
    @Request() req: { user: any },
    @Res() response: Response,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number,
    @Query("offset", new ParseIntPipe({ optional: true })) offset?: number,
    @Headers("if-none-match") ifNoneMatch?: string,
  ): Promise<any> {
    const [venues, total] = await this.venueService.getVenuesWithAdminOverrides(
      req.user,
      limit,
      offset,
    );

    // Generate ETag based on the data
    const etagData = JSON.stringify({
      venues: venues.map((v) => v.id + v.updatedAt),
      total,
    });
    const etag = this.generateETag(Buffer.from(etagData));

    // If client sent If-None-Match and it matches our ETag, return 304 Not Modified
    if (ifNoneMatch && this.compareETags(ifNoneMatch, etag)) {
      return response.status(304).header("ETag", etag).send();
    }

    // Otherwise return the full data with the ETag
    return response.header("ETag", etag).json({ venues, total });
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a venue with admin overrides" })
  @ApiResponse({ status: 200, description: "Venue updated successfully" })
  @ApiParam({ name: "id", description: "Venue ID" })
  @Header("Cache-Control", "no-cache")
  async updateVenue(
    @Request() req: { user: any },
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateDto: AdminVenueUpdateDto,
  ): Promise<AdminVenueResponseDto> {
    return this.venueService.adminUpdateVenue(req.user, id, updateDto);
  }

  @Post(":id/refresh-google-data")
  @ApiOperation({ summary: "Refresh Google data for a venue" })
  @ApiResponse({
    status: 200,
    description: "Google data refreshed successfully",
  })
  @ApiParam({ name: "id", description: "Venue ID" })
  @Header("Cache-Control", "no-cache")
  async refreshGoogleData(
    @Request() req: { user: any },
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<AdminVenueResponseDto> {
    return this.venueService.refreshVenueGoogleData(req.user, id);
  }

  @Get(":id/photos")
  @ApiOperation({
    summary: "Get all photos for a venue (including unapproved)",
  })
  @ApiResponse({ status: 200, description: "List of venue photos" })
  @ApiParam({ name: "id", description: "Venue ID" })
  @ApiQuery({
    name: "source",
    required: false,
    enum: ["google", "admin", "user"],
  })
  @ApiQuery({
    name: "deviceType",
    required: false,
    enum: ["mobile", "tablet", "desktop"],
    description: "Device type for optimized image sizes",
  })
  @ApiQuery({
    name: "context",
    required: false,
    description: "Context of display (list/detail/thumbnail)",
  })
  @ApiHeader({
    name: "If-None-Match",
    required: false,
    description: "ETag for conditional requests",
  })
  @Header("Cache-Control", "private, max-age=60")
  async getVenuePhotos(
    @Request() req: { user: any },
    @Res() response: Response,
    @Param("id", ParseUUIDPipe) id: string,
    @Query("source") source?: "google" | "admin" | "user",
    @Query("deviceType") deviceType?: "mobile" | "tablet" | "desktop",
    @Query("context") context?: string,
    @Headers("if-none-match") ifNoneMatch?: string,
  ): Promise<any> {
    // If deviceType is specified, use the optimized photos endpoint
    if (deviceType) {
      const result = await this.venueImageService.getOptimizedPhotos(
        id,
        deviceType,
        context || "list",
        ifNoneMatch,
      );

      // If status is 304, return Not Modified
      if (result.status === 304) {
        return response.status(304).send();
      }

      // Otherwise return the optimized photos
      return response.json(result.photos);
    }

    // Otherwise use the standard admin photos endpoint
    const photos = await this.venueService.adminGetVenuePhotos(
      req.user,
      id,
      source,
    );

    // Generate ETag for the collection
    const etagData = JSON.stringify(photos.map((p) => p.id + p.updatedAt));
    const etag = this.generateETag(Buffer.from(etagData));

    // If client sent If-None-Match and it matches our ETag, return 304 Not Modified
    if (ifNoneMatch && this.compareETags(ifNoneMatch, etag)) {
      return response.status(304).header("ETag", etag).send();
    }

    // Otherwise return the full data with the ETag
    return response.header("ETag", etag).json(photos);
  }

  @Post(":id/photos")
  @ApiOperation({ summary: "Upload a photo for a venue as admin" })
  @ApiResponse({ status: 201, description: "Photo uploaded successfully" })
  @ApiParam({ name: "id", description: "Venue ID" })
  @Header("Cache-Control", "no-cache")
  async uploadPhoto(
    @Request() req: { user: any },
    @Param("id", ParseUUIDPipe) id: string,
    @Body() uploadDto: AdminPhotoUploadDto,
  ): Promise<VenuePhoto> {
    const photoData: Partial<VenuePhoto> = {
      caption: uploadDto.caption,
      isPrimary: uploadDto.isPrimary,
      photoUrl: "placeholder-until-actual-file-upload-integration",
    };

    return this.venueService.adminAddVenuePhoto(req.user, id, photoData);
  }

  @Post("photos/bulk-approve")
  @ApiOperation({ summary: "Bulk approve photos" })
  @ApiResponse({ status: 200, description: "Photos approved successfully" })
  @Header("Cache-Control", "no-cache")
  async bulkApprovePhotos(
    @Request() req: { user: any },
    @Body() dto: AdminBulkApprovePhotosDto,
  ): Promise<{ success: boolean }> {
    const result = await this.venueService.adminBulkApprovePhotos(
      req.user,
      dto,
    );
    return { success: result };
  }

  @Post("photos/update-order")
  @ApiOperation({ summary: "Update photo order" })
  @ApiResponse({ status: 200, description: "Photo order updated successfully" })
  @Header("Cache-Control", "no-cache")
  async updatePhotoOrder(
    @Request() req: { user: any },
    @Body() dto: AdminPhotoOrderDto,
  ): Promise<{ success: boolean }> {
    const result = await this.venueService.adminUpdatePhotoOrder(req.user, dto);
    return { success: result };
  }

  @Post("photos/:id/set-primary")
  @ApiOperation({ summary: "Set a photo as primary" })
  @ApiResponse({
    status: 200,
    description: "Photo set as primary successfully",
  })
  @ApiParam({ name: "id", description: "Photo ID" })
  @Header("Cache-Control", "no-cache")
  async setPrimaryPhoto(
    @Request() req: { user: any },
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AdminSetPrimaryPhotoDto,
  ): Promise<{ success: boolean }> {
    // Use the venueImageService to set the primary photo
    const result = await this.venueImageService.setPrimaryPhoto(
      dto.photoId,
      id, // This should actually be the venue ID
      req.user,
    );
    return { success: result };
  }

  /**
   * Generate an ETag hash for caching
   */
  private generateETag(buffer: Buffer): string {
    const hash = crypto.createHash("md5");
    hash.update(buffer);
    return `"${hash.digest("hex")}"`;
  }

  /**
   * Compare ETags for conditional requests
   */
  private compareETags(clientETag: string, serverETag: string): boolean {
    // Remove quotes if present
    const cleanClientETag = clientETag.replace(/^"(.*)"$/, "$1");
    const cleanServerETag = serverETag.replace(/^"(.*)"$/, "$1");
    return cleanClientETag === cleanServerETag;
  }
}
