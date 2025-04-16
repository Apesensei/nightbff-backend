import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class AgeVerificationDto {
  @IsUUID(4, { message: "User ID must be a valid UUID" })
  @IsNotEmpty({ message: "User ID is required" })
  userId: string;

  @IsString({ message: "Front document image must be a string" })
  @IsNotEmpty({ message: "Front document image is required" })
  frontDocumentImageBase64: string;

  @IsString({ message: "Back document image must be a string" })
  backDocumentImageBase64?: string;

  @IsString({ message: "Document type must be a string" })
  @IsNotEmpty({ message: "Document type is required" })
  documentType: string;

  @IsString({ message: "Selfie image must be a string" })
  @IsNotEmpty({ message: "Selfie image is required" })
  selfieImageBase64: string;
}
