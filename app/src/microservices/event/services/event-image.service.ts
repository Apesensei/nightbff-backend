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
import { EventRepository } from "../repositories/event.repository";

// Add Express.Multer type declarations if not already declared
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-namespace -- TODO: Explore replacing global augmentation with local types/casting if feasible without altering behavior
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
export class EventImageService {
  private uploadDir: string;
  private maxFileSize: number;
  private baseUrl: string;
  private logger = new Logger(EventImageService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly eventRepository: EventRepository,
  ) {
    this.uploadDir =
      this.configService.get("UPLOAD_DIR_EVENT") || "uploads/event";
    this.maxFileSize =
      this.configService.get("MAX_UPLOAD_SIZE") || MAX_FILE_SIZE;
    this.baseUrl = this.configService.get("API_URL") || "http://localhost:3000";

    // Ensure upload directory exists
    this.ensureUploadDirExists();
  }

  private async ensureUploadDirExists(): Promise<void> {
    try {
      if (!(await fileExists(this.uploadDir))) {
        await mkdir(this.uploadDir, { recursive: true });
      }
    } catch (error) {
      this.logger.error("Error creating upload directory:", error);
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

  async uploadEventCoverImage(
    file: Express.Multer.File,
    eventId: string,
    userId: string,
  ): Promise<string> {
    // Validate file
    await this.validateFile(file);

    // Check if event exists and user is authorized
    const event = await this.eventRepository.findOne(eventId);
    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // Check if the user is the event creator
    if (event.creatorId !== userId) {
      throw new ForbiddenException(
        "Only the event creator can upload cover images",
      );
    }

    // Generate a unique filename
    const fileHash = crypto.createHash("md5").update(file.buffer).digest("hex");

    const fileExt = path.extname(file.originalname).toLowerCase();
    const fileName = `${eventId}_cover_${uuidv4()}_${fileHash}${fileExt}`;
    const filePath = path.join(this.uploadDir, fileName);

    // Save file
    await writeFile(filePath, file.buffer);

    // Generate URL for the file
    const fileUrl = `${this.baseUrl}/uploads/event/${fileName}`;

    // Delete old cover image if it exists
    if (event.coverImage) {
      await this.deleteFile(event.coverImage);
    }

    // Update event with the new cover image URL
    await this.eventRepository.update(eventId, { coverImage: fileUrl });

    return fileUrl;
  }

  async deleteEventCoverImage(
    eventId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      // Check if event exists and user is authorized
      const event = await this.eventRepository.findOne(eventId);
      if (!event) {
        throw new NotFoundException(`Event with ID ${eventId} not found`);
      }

      // Check if the user is the event creator
      if (event.creatorId !== userId) {
        throw new ForbiddenException(
          "Only the event creator can delete cover images",
        );
      }

      if (!event.coverImage) {
        return false;
      }

      // Delete file from storage
      await this.deleteFile(event.coverImage);

      // Update event to remove cover image URL
      await this.eventRepository.update(eventId, { coverImage: undefined });

      return true;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error("Error deleting event cover image:", error);
      return false;
    }
  }

  private async deleteFile(fileUrl: string): Promise<boolean> {
    try {
      // Extract filename from URL
      const fileName = path.basename(fileUrl);
      const filePath = path.join(this.uploadDir, fileName);

      // Check if file exists
      if (await fileExists(filePath)) {
        // Delete file
        await unlink(filePath);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error("Error deleting file:", error);
      return false;
    }
  }
}
