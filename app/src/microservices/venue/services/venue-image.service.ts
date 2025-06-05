import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import { promisify } from "util";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import { VenuePhotoRepository } from "../repositories/venue-photo.repository";
import { VenueRepository } from "../repositories/venue.repository";
import { UserRole } from "../../auth/entities/user.entity";
import { VenuePhoto, PhotoSource } from "../entities/venue-photo.entity";
import { VenueCacheService } from "./venue-cache.service";
import {
  ImageProcessingService,
  ImageProcessingJobData,
} from "./image-processing.service";

// Image size definitions for different device contexts
export interface ImageSizes {
  original: string;
  thumbnail: string;
  medium: string;
  large: string;
}

export type DeviceType = "mobile" | "tablet" | "desktop";

// Add Express.Multer type declarations if not already declared
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
      }
    }
  }
}

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const fileExists = promisify(fs.exists);
const unlink = promisify(fs.unlink);

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

@Injectable()
export class VenueImageService {
  private uploadDir: string;
  private maxFileSize: number;
  private baseUrl: string;
  private logger = new Logger(VenueImageService.name);
  private readonly imageSizeConfigs = {
    thumbnail: { width: 150, height: 150 },
    medium: { width: 600, height: 400 },
    large: { width: 1200, height: 800 },
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly venuePhotoRepository: VenuePhotoRepository,
    private readonly venueRepository: VenueRepository,
    private readonly cacheService: VenueCacheService,
    private readonly imageProcessingService: ImageProcessingService,
  ) {
    this.uploadDir =
      this.configService.get("UPLOAD_DIR_VENUE") || "uploads/venue";
    this.maxFileSize =
      this.configService.get("MAX_UPLOAD_SIZE") || MAX_FILE_SIZE;
    this.baseUrl = this.configService.get("API_URL") || "http://localhost:3000";

    // Ensure upload directory exists
    this.ensureUploadDirExists();
  }

  private async ensureUploadDirExists(): Promise<void> {
    try {
      // Create main upload directory
      if (!(await fileExists(this.uploadDir))) {
        await mkdir(this.uploadDir, { recursive: true });
      }

      // Create subdirectories for different image sizes
      const sizes = ["original", "thumbnail", "medium", "large"];
      for (const size of sizes) {
        const sizeDir = path.join(this.uploadDir, size);
        if (!(await fileExists(sizeDir))) {
          await mkdir(sizeDir, { recursive: true });
        }
      }
    } catch (error) {
      this.logger.error("Error creating upload directories:", error);
    }
  }

  async validateFile(file: Express.Multer.File): Promise<void> {
    // Check file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds the limit of ${this.maxFileSize / (1024 * 1024)}MB`,
      );
    }

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`,
      );
    }
  }

  /**
   * Generate ETag for image file
   */
  private generateETag(buffer: Buffer): string {
    return crypto.createHash("md5").update(buffer).digest("hex");
  }

  /**
   * Check if client's ETag matches current ETag (for conditional requests)
   */
  checkETagMatch(clientETag: string, currentETag: string): boolean {
    // Remove quotes if present
    clientETag = clientETag.replace(/^"(.*)"$/, "$1");
    currentETag = currentETag.replace(/^"(.*)"$/, "$1");

    return clientETag === currentETag;
  }

  /**
   * Determine appropriate image size based on device and context
   */
  getAppropriateImageSize(deviceType: DeviceType, context?: string): string {
    if (context === "profile" || context === "thumbnail") {
      return "thumbnail";
    }

    if (deviceType === "mobile") {
      return context === "full" ? "medium" : "thumbnail";
    } else if (deviceType === "tablet") {
      return context === "full" ? "large" : "medium";
    } else {
      return context === "full" ? "original" : "large";
    }
  }

  private hasRequiredRole(user: any, roles: UserRole[]): boolean {
    if (!user || !user.roles) {
      return false;
    }
    return user.roles.some((role: string) => roles.includes(role as UserRole));
  }

  /**
   * Process and resize images for different device contexts
   */
  private async processAndSaveImages(
    buffer: Buffer,
    fileName: string,
    mimetype: string,
  ): Promise<ImageSizes> {
    const fileExt =
      mimetype === "image/jpeg"
        ? ".jpg"
        : mimetype === "image/png"
          ? ".png"
          : mimetype === "image/webp"
            ? ".webp"
            : mimetype === "image/gif"
              ? ".gif"
              : ".jpg";

    const baseFileName = fileName.replace(/\.[^/.]+$/, "");
    const result: ImageSizes = {
      original: "",
      thumbnail: "",
      medium: "",
      large: "",
    };

    try {
      // Save original
      const originalPath = path.join(
        this.uploadDir,
        "original",
        `${baseFileName}${fileExt}`,
      );
      await writeFile(originalPath, buffer);
      result.original = `${this.baseUrl}/uploads/venue/original/${baseFileName}${fileExt}`;

      // SVG doesn't need resizing
      if (mimetype === "image/svg+xml") {
        result.thumbnail = result.medium = result.large = result.original;
        return result;
      }

      // Process thumbnail
      const thumbPath = path.join(
        this.uploadDir,
        "thumbnail",
        `${baseFileName}${fileExt}`,
      );
      await sharp(buffer)
        .resize(
          this.imageSizeConfigs.thumbnail.width,
          this.imageSizeConfigs.thumbnail.height,
          {
            fit: "cover",
            position: "centre",
          },
        )
        .toFile(thumbPath);
      result.thumbnail = `${this.baseUrl}/uploads/venue/thumbnail/${baseFileName}${fileExt}`;

      // Process medium
      const mediumPath = path.join(
        this.uploadDir,
        "medium",
        `${baseFileName}${fileExt}`,
      );
      await sharp(buffer)
        .resize(
          this.imageSizeConfigs.medium.width,
          this.imageSizeConfigs.medium.height,
          {
            fit: "inside",
            withoutEnlargement: true,
          },
        )
        .toFile(mediumPath);
      result.medium = `${this.baseUrl}/uploads/venue/medium/${baseFileName}${fileExt}`;

      // Process large
      const largePath = path.join(
        this.uploadDir,
        "large",
        `${baseFileName}${fileExt}`,
      );
      await sharp(buffer)
        .resize(
          this.imageSizeConfigs.large.width,
          this.imageSizeConfigs.large.height,
          {
            fit: "inside",
            withoutEnlargement: true,
          },
        )
        .toFile(largePath);
      result.large = `${this.baseUrl}/uploads/venue/large/${baseFileName}${fileExt}`;

      return result;
    } catch (error) {
      this.logger.error("Error processing images:", error);
      // If we fail processing variations, at least return the original
      return {
        original: result.original,
        thumbnail: result.original,
        medium: result.original,
        large: result.original,
      };
    }
  }

  async uploadVenuePhoto(
    file: Express.Multer.File,
    venueId: string,
    user: any,
    caption?: string,
  ): Promise<Record<string, any>> {
    // Validate file
    await this.validateFile(file);

    // Check if venue exists
    const venue = await this.venueRepository.findById(venueId);
    if (!venue) {
      throw new NotFoundException(`Venue with ID ${venueId} not found`);
    }

    // Generate a unique filename
    const fileHash = crypto.createHash("md5").update(file.buffer).digest("hex");

    const fileExt = path.extname(file.originalname).toLowerCase();
    const fileName = `${venueId}_photo_${uuidv4()}_${fileHash}${fileExt}`;

    // Check if async processing is enabled
    const asyncProcessing = this.configService.get<boolean>(
      "IMAGE_PROCESSING_ASYNC",
      false,
    );

    let imageUrls: ImageSizes;

    if (asyncProcessing) {
      // Queue image processing for background execution
      const jobData: ImageProcessingJobData = {
        buffer: file.buffer,
        fileName,
        mimetype: file.mimetype,
        uploadDir: this.uploadDir,
        baseUrl: this.baseUrl,
      };

      const jobId =
        await this.imageProcessingService.queueImageProcessing(jobData);

      // Save original image immediately for quick response
      const originalPath = path.join(this.uploadDir, "original", fileName);
      await writeFile(originalPath, file.buffer);
      const originalUrl = `${this.baseUrl}/uploads/venue/original/${fileName}`;

      // Set placeholder URLs that will be updated when processing completes
      imageUrls = {
        original: originalUrl,
        thumbnail: originalUrl, // Temporary - will be updated by background job
        medium: originalUrl, // Temporary - will be updated by background job
        large: originalUrl, // Temporary - will be updated by background job
      };

      this.logger.log(
        `Image processing queued with job ID: ${jobId} for file: ${fileName}`,
      );
    } else {
      // Process images synchronously (legacy behavior)
      const jobData: ImageProcessingJobData = {
        buffer: file.buffer,
        fileName,
        mimetype: file.mimetype,
        uploadDir: this.uploadDir,
        baseUrl: this.baseUrl,
      };

      imageUrls =
        await this.imageProcessingService.processImagesSynchronously(jobData);
    }

    // Generate ETag for the original image
    const etag = this.generateETag(file.buffer);

    // Create venue photo record
    const isAdmin = this.hasRequiredRole(user, [
      UserRole.ADMIN,
      UserRole.VENUE_OWNER,
    ]);

    const photoData: Partial<VenuePhoto> = {
      venueId,
      userId: user.id,
      photoUrl: imageUrls.original,
      thumbnailUrl: imageUrls.thumbnail,
      mediumUrl: imageUrls.medium,
      largeUrl: imageUrls.large,
      etag,
      caption,
      isApproved: isAdmin, // Auto-approve for admins and venue owners
      isPrimary: false, // New photos are not primary by default
      source: isAdmin ? ("admin" as PhotoSource) : ("user" as PhotoSource),
    };

    const photo = await this.venuePhotoRepository.create(photoData);

    // If async processing, queue URL update job for when processing completes
    if (asyncProcessing) {
      // Note: In a production system, you'd want to implement a callback mechanism
      // or use Redis pub/sub to update the photo URLs when processing completes
      this.logger.log(
        `Photo created with ID: ${photo.id}, image processing in background`,
      );
    }

    // Invalidate cache for this venue's photos
    await this.cacheService.invalidateSelective(venueId, ["photos"]);

    // Return optimized response with appropriate fields
    return {
      id: photo.id,
      urls: imageUrls,
      etag: photo.etag,
      caption: photo.caption,
      isPrimary: photo.isPrimary,
      isApproved: photo.isApproved,
      createdAt: photo.createdAt,
      processing: asyncProcessing ? "background" : "completed",
    };
  }

  async deleteVenuePhoto(photoId: string, user: any): Promise<boolean> {
    try {
      // Check if photo exists
      const photo = await this.venuePhotoRepository.findById(photoId);
      if (!photo) {
        throw new NotFoundException(`Venue photo with ID ${photoId} not found`);
      }

      // Check if user is authorized to delete this photo
      const isAdmin = this.hasRequiredRole(user, [
        UserRole.ADMIN,
        UserRole.VENUE_OWNER,
      ]);
      if (!isAdmin && photo.userId !== user.id) {
        throw new ForbiddenException(
          "You are not authorized to delete this photo",
        );
      }

      // Delete all image variations
      await this.deleteImageFiles(photo);

      // Delete photo record
      await this.venuePhotoRepository.delete(photoId);

      // Invalidate cache for this venue's photos
      await this.cacheService.invalidateSelective(photo.venueId, ["photos"]);

      return true;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error("Error deleting venue photo:", error);
      return false;
    }
  }

  private async deleteImageFiles(photo: any): Promise<void> {
    try {
      // Extract base filename from URL
      const originalUrl = photo.photoUrl;
      const baseUrl = `${this.baseUrl}/uploads/venue/`;
      if (!originalUrl.startsWith(baseUrl)) {
        this.logger.warn(`Cannot parse photo URL format: ${originalUrl}`);
        return;
      }

      const relativePathWithFile = originalUrl.substring(baseUrl.length);
      const pathParts = relativePathWithFile.split("/");
      if (pathParts.length < 2) {
        this.logger.warn(
          `Unexpected photo path format: ${relativePathWithFile}`,
        );
        return;
      }

      const filename = pathParts[pathParts.length - 1];
      const sizes = ["original", "thumbnail", "medium", "large"];

      for (const size of sizes) {
        const filePath = path.join(this.uploadDir, size, filename);
        if (await fileExists(filePath)) {
          await unlink(filePath);
        }
      }
    } catch (error) {
      this.logger.error("Error deleting image files:", error);
    }
  }

  async setPrimaryPhoto(
    photoId: string,
    venueId: string,
    user: any,
  ): Promise<boolean> {
    try {
      // Check if user is authorized to set primary photo
      const isAdmin = this.hasRequiredRole(user, [
        UserRole.ADMIN,
        UserRole.VENUE_OWNER,
      ]);
      if (!isAdmin) {
        throw new ForbiddenException(
          "Only admins and venue owners can set primary photos",
        );
      }

      // Check if photo exists and belongs to the venue
      const photo = await this.venuePhotoRepository.findById(photoId);
      if (!photo || photo.venueId !== venueId) {
        throw new NotFoundException(
          `Venue photo with ID ${photoId} not found for venue ${venueId}`,
        );
      }

      // Reset all photos to non-primary
      await this.venuePhotoRepository.resetPrimaryPhotos(venueId);

      // Set this photo as primary
      await this.venuePhotoRepository.update(photoId, { isPrimary: true });

      // Invalidate cache for this venue
      await this.cacheService.invalidateSelective(venueId, [
        "photos",
        "primaryPhoto",
      ]);

      return true;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error("Error setting primary venue photo:", error);
      return false;
    }
  }

  async approvePhoto(photoId: string, user: any): Promise<boolean> {
    try {
      // Check if user is authorized to approve photos
      const isAdmin = this.hasRequiredRole(user, [
        UserRole.ADMIN,
        UserRole.VENUE_OWNER,
        UserRole.MODERATOR,
      ]);
      if (!isAdmin) {
        throw new ForbiddenException(
          "You are not authorized to approve photos",
        );
      }

      // Check if photo exists
      const photo = await this.venuePhotoRepository.findById(photoId);
      if (!photo) {
        throw new NotFoundException(`Venue photo with ID ${photoId} not found`);
      }

      // Approve the photo
      await this.venuePhotoRepository.update(photoId, { isApproved: true });

      // Invalidate cache for this venue's photos
      await this.cacheService.invalidateSelective(photo.venueId, ["photos"]);

      return true;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error("Error approving venue photo:", error);
      return false;
    }
  }

  /**
   * Get optimized photos for mobile devices
   */
  async getOptimizedPhotos(
    venueId: string,
    deviceType: DeviceType = "mobile",
    context: string = "list",
    ifNoneMatch?: string,
  ): Promise<{ photos: any[]; status: number }> {
    // Try to get from cache first
    const cacheKey = `photos:${venueId}:${deviceType}:${context}`;
    const cached = await this.cacheService.get<{ photos: any[]; etag: string }>(
      "optimized_photos",
      { key: cacheKey },
    );

    // If we have cached data and the ETag matches, return 304 Not Modified
    if (
      cached &&
      ifNoneMatch &&
      this.checkETagMatch(ifNoneMatch, cached.etag)
    ) {
      return { photos: [], status: 304 }; // Not Modified
    }

    // Get photos from database
    const photos = await this.venuePhotoRepository.findByVenueId(venueId);

    // Determine appropriate image size
    const sizeKey = this.getAppropriateImageSize(deviceType, context);

    // Transform photos for optimized response
    const optimizedPhotos = photos.map((photo) => {
      let imageUrl = photo.photoUrl; // Default to original

      // Select appropriate size URL based on the determined size
      if (sizeKey === "thumbnail" && photo.thumbnailUrl) {
        imageUrl = photo.thumbnailUrl;
      } else if (sizeKey === "medium" && photo.mediumUrl) {
        imageUrl = photo.mediumUrl;
      } else if (sizeKey === "large" && photo.largeUrl) {
        imageUrl = photo.largeUrl;
      }

      return {
        id: photo.id,
        url: imageUrl,
        caption: photo.caption,
        isPrimary: photo.isPrimary,
        order: photo.order,
        etag: photo.etag,
      };
    });

    // Generate ETag for the collection
    const collectionETag = this.generateETag(
      Buffer.from(JSON.stringify(optimizedPhotos.map((p) => p.id + p.etag))),
    );

    // Cache the result with the ETag
    await this.cacheService.set(
      "optimized_photos",
      { key: cacheKey },
      { photos: optimizedPhotos, etag: collectionETag },
      1800, // 30 minutes TTL
    );

    return {
      photos: optimizedPhotos,
      status: 200,
    };
  }

  /**
   * Bulk approve photos (admin only)
   */
  async bulkApprovePhotos(photoIds: string[], user: any): Promise<boolean> {
    try {
      // Check if user is authorized
      const isAdmin = this.hasRequiredRole(user, [
        UserRole.ADMIN,
        UserRole.MODERATOR,
      ]);
      if (!isAdmin) {
        throw new ForbiddenException(
          "You are not authorized to perform bulk photo operations",
        );
      }

      // Find all photos to get their venue IDs (for cache invalidation)
      const photos = await Promise.all(
        photoIds.map((id) => this.venuePhotoRepository.findById(id)),
      );

      // Approve all photos
      await this.venuePhotoRepository.bulkApprove(photoIds);

      // Collect unique venue IDs for cache invalidation
      const venueIds = [...new Set(photos.map((photo) => photo.venueId))];

      // Invalidate cache for each affected venue
      for (const venueId of venueIds) {
        await this.cacheService.invalidateSelective(venueId, ["photos"]);
      }

      return true;
    } catch (error) {
      this.logger.error("Error in bulk photo approval:", error);
      if (error instanceof ForbiddenException) {
        throw error;
      }
      return false;
    }
  }
}
