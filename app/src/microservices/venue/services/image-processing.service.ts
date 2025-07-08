import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import type { Queue } from "bull";
import { ConfigService } from "@nestjs/config";
import sharp from "sharp";
import * as path from "path";
import * as fs from "fs";
import { promisify } from "util";

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const fileExists = promisify(fs.exists);

export interface ImageProcessingJobData {
  buffer: Buffer;
  fileName: string;
  mimetype: string;
  uploadDir: string;
  baseUrl: string;
}

export interface ImageSizes {
  original: string;
  thumbnail: string;
  medium: string;
  large: string;
}

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);
  private readonly imageSizeConfigs = {
    thumbnail: { width: 150, height: 150 },
    medium: { width: 600, height: 400 },
    large: { width: 1200, height: 800 },
  };

  constructor(
    @InjectQueue("image-processing") private readonly imageQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Queue image processing job for background execution
   */
  async queueImageProcessing(jobData: ImageProcessingJobData): Promise<string> {
    const job = await this.imageQueue.add("process-images", jobData, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: 10, // Keep last 10 successful jobs
      removeOnFail: 50, // Keep last 50 failed jobs for debugging
    });

    this.logger.log(
      `Image processing job queued: ${job.id} for file: ${jobData.fileName}`,
    );
    return job.id.toString();
  }

  /**
   * Process images synchronously (for immediate response or fallback)
   */
  async processImagesSynchronously(
    jobData: ImageProcessingJobData,
  ): Promise<ImageSizes> {
    const { buffer, fileName, mimetype, uploadDir, baseUrl } = jobData;

    const fileExt = this.getFileExtension(mimetype);
    const baseFileName = fileName.replace(/\.[^/.]+$/, "");
    const result: ImageSizes = {
      original: "",
      thumbnail: "",
      medium: "",
      large: "",
    };

    try {
      // Ensure directories exist
      await this.ensureDirectoriesExist(uploadDir);

      // Save original
      const originalPath = path.join(
        uploadDir,
        "original",
        `${baseFileName}${fileExt}`,
      );
      await writeFile(originalPath, buffer);
      result.original = `${baseUrl}/uploads/venue/original/${baseFileName}${fileExt}`;

      // SVG doesn't need resizing
      if (mimetype === "image/svg+xml") {
        result.thumbnail = result.medium = result.large = result.original;
        return result;
      }

      // Get quality setting from config
      const quality = this.configService.get<number>(
        "IMAGE_PROCESSING_QUALITY",
        85,
      );

      // Process thumbnail
      const thumbPath = path.join(
        uploadDir,
        "thumbnail",
        `${baseFileName}${fileExt}`,
      );
      await this.processImage(
        buffer,
        thumbPath,
        this.imageSizeConfigs.thumbnail,
        quality,
      );
      result.thumbnail = `${baseUrl}/uploads/venue/thumbnail/${baseFileName}${fileExt}`;

      // Process medium
      const mediumPath = path.join(
        uploadDir,
        "medium",
        `${baseFileName}${fileExt}`,
      );
      await this.processImage(
        buffer,
        mediumPath,
        this.imageSizeConfigs.medium,
        quality,
      );
      result.medium = `${baseUrl}/uploads/venue/medium/${baseFileName}${fileExt}`;

      // Process large
      const largePath = path.join(
        uploadDir,
        "large",
        `${baseFileName}${fileExt}`,
      );
      await this.processImage(
        buffer,
        largePath,
        this.imageSizeConfigs.large,
        quality,
      );
      result.large = `${baseUrl}/uploads/venue/large/${baseFileName}${fileExt}`;

      this.logger.log(`Successfully processed image: ${fileName}`);
      return result;
    } catch (error) {
      this.logger.error(`Error processing image ${fileName}:`, error);
      // Return original only if processing fails
      return {
        original: result.original,
        thumbnail: result.original,
        medium: result.original,
        large: result.original,
      };
    }
  }

  /**
   * Process individual image with Sharp
   */
  private async processImage(
    buffer: Buffer,
    outputPath: string,
    config: { width: number; height: number },
    quality: number,
  ): Promise<void> {
    const sharpInstance = sharp(buffer).resize(config.width, config.height, {
      fit: config.width === config.height ? "cover" : "inside",
      position: "centre",
      withoutEnlargement: true,
    });

    // Apply quality settings for JPEG
    if (outputPath.endsWith(".jpg") || outputPath.endsWith(".jpeg")) {
      sharpInstance.jpeg({ quality, progressive: true });
    } else if (outputPath.endsWith(".png")) {
      sharpInstance.png({ compressionLevel: 9 });
    } else if (outputPath.endsWith(".webp")) {
      sharpInstance.webp({ quality });
    }

    await sharpInstance.toFile(outputPath);
  }

  /**
   * Ensure all required directories exist
   */
  private async ensureDirectoriesExist(uploadDir: string): Promise<void> {
    const sizes = ["original", "thumbnail", "medium", "large"];
    for (const size of sizes) {
      const sizeDir = path.join(uploadDir, size);
      if (!(await fileExists(sizeDir))) {
        await mkdir(sizeDir, { recursive: true });
      }
    }
  }

  /**
   * Get file extension from MIME type
   */
  private getFileExtension(mimetype: string): string {
    switch (mimetype) {
      case "image/jpeg":
        return ".jpg";
      case "image/png":
        return ".png";
      case "image/webp":
        return ".webp";
      case "image/gif":
        return ".gif";
      case "image/svg+xml":
        return ".svg";
      default:
        return ".jpg";
    }
  }

  /**
   * Get queue statistics for monitoring
   */
  async getQueueStats() {
    const waiting = await this.imageQueue.getWaiting();
    const active = await this.imageQueue.getActive();
    const completed = await this.imageQueue.getCompleted();
    const failed = await this.imageQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      queue: "image-processing",
    };
  }
}
