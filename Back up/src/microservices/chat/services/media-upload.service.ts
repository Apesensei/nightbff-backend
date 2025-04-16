import { Injectable, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import { promisify } from "util";
import { v4 as uuidv4 } from "uuid";

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const fileExists = promisify(fs.exists);

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

@Injectable()
export class MediaUploadService {
  private uploadDir: string;
  private maxFileSize: number;
  private baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = this.configService.get("UPLOAD_DIR") || "uploads/chat";
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
      console.error("Error creating upload directory:", error);
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

  async uploadFile(file: Express.Multer.File, userId: string): Promise<string> {
    // Validate file
    await this.validateFile(file);

    // Generate a unique filename
    const fileHash = crypto.createHash("md5").update(file.buffer).digest("hex");

    const fileExt = path.extname(file.originalname).toLowerCase();
    const fileName = `${userId}_${uuidv4()}_${fileHash}${fileExt}`;
    const filePath = path.join(this.uploadDir, fileName);

    // Save file
    await writeFile(filePath, file.buffer);

    // Return URL
    return `${this.baseUrl}/uploads/chat/${fileName}`;
  }

  async deleteFile(fileUrl: string): Promise<boolean> {
    try {
      // Extract filename from URL
      const fileName = path.basename(fileUrl);
      const filePath = path.join(this.uploadDir, fileName);

      // Check if file exists
      if (await fileExists(filePath)) {
        // Delete file
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error("Error deleting file:", err);
          }
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error deleting file:", error);
      return false;
    }
  }
}
