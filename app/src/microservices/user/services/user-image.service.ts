import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import { promisify } from "util";
import { v4 as uuidv4 } from "uuid";
import { ProfileRepository } from "../repositories/profile.repository";
import { AuthRepository } from "../../auth/repositories/auth.repository";

// Add Express.Multer type declarations
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
export class UserImageService {
  private uploadDir: string;
  private maxFileSize: number;
  private baseUrl: string;
  private logger = new Logger(UserImageService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly profileRepository: ProfileRepository,
    private readonly authRepository: AuthRepository,
  ) {
    this.uploadDir =
      this.configService.get("UPLOAD_DIR_USER") || "uploads/user";
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

  async uploadProfileImage(
    file: Express.Multer.File,
    userId: string,
  ): Promise<string> {
    // Validate file
    await this.validateFile(file);

    // Generate a unique filename
    const fileHash = crypto.createHash("md5").update(file.buffer).digest("hex");

    const fileExt = path.extname(file.originalname).toLowerCase();
    const fileName = `${userId}_profile_${uuidv4()}_${fileHash}${fileExt}`;
    const filePath = path.join(this.uploadDir, fileName);

    // Save file
    await writeFile(filePath, file.buffer);

    // Generate URL for the file
    const fileUrl = `${this.baseUrl}/uploads/user/${fileName}`;

    // Update user photoURL in database
    await this.authRepository.updatePhotoUrl(userId, fileUrl);

    return fileUrl;
  }

  async uploadProfileCoverImage(
    file: Express.Multer.File,
    userId: string,
  ): Promise<string> {
    // Validate file
    await this.validateFile(file);

    // Generate a unique filename
    const fileHash = crypto.createHash("md5").update(file.buffer).digest("hex");

    const fileExt = path.extname(file.originalname).toLowerCase();
    const fileName = `${userId}_cover_${uuidv4()}_${fileHash}${fileExt}`;
    const filePath = path.join(this.uploadDir, fileName);

    // Save file
    await writeFile(filePath, file.buffer);

    // Generate URL for the file
    const fileUrl = `${this.baseUrl}/uploads/user/${fileName}`;

    // Update profile cover URL in database
    const profile = await this.profileRepository.findByUserId(userId);
    profile.profileCoverUrl = fileUrl;
    await this.profileRepository.updateProfile(userId, {
      profileCoverUrl: fileUrl,
    });

    return fileUrl;
  }

  async deleteProfileImage(userId: string): Promise<boolean> {
    try {
      // Get current photo URL
      const user = await this.authRepository.findById(userId);
      if (!user || !user.photoURL) {
        return false;
      }

      // Extract filename from URL
      const fileName = path.basename(user.photoURL);
      const filePath = path.join(this.uploadDir, fileName);

      // Check if file exists
      if (await fileExists(filePath)) {
        // Delete file
        await unlink(filePath);
      }

      // Update user record with null photo URL
      await this.authRepository.updatePhotoUrl(userId, null);

      return true;
    } catch (error) {
      this.logger.error("Error deleting profile image:", error);
      return false;
    }
  }

  async deleteProfileCoverImage(userId: string): Promise<boolean> {
    try {
      // Get current cover URL
      const profile = await this.profileRepository.findByUserId(userId);
      if (!profile.profileCoverUrl) {
        return false;
      }

      // Extract filename from URL
      const fileName = path.basename(profile.profileCoverUrl);
      const filePath = path.join(this.uploadDir, fileName);

      // Check if file exists
      if (await fileExists(filePath)) {
        // Delete file
        await unlink(filePath);
      }

      // Update profile record
      await this.profileRepository.updateProfile(userId, {
        profileCoverUrl: undefined,
      });

      return true;
    } catch (error) {
      this.logger.error("Error deleting profile cover image:", error);
      return false;
    }
  }
}
