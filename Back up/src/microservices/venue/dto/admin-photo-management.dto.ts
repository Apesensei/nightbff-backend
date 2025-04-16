import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class AdminBulkApprovePhotosDto {
  @ApiProperty({
    description: "Array of photo IDs to approve",
    type: [String],
    example: [
      "123e4567-e89b-12d3-a456-426614174000",
      "123e4567-e89b-12d3-a456-426614174001",
    ],
  })
  @IsArray()
  @IsUUID("4", { each: true })
  photoIds: string[];
}

export class AdminPhotoOrderDto {
  @ApiProperty({
    description: "Order configuration for photos",
    example: [
      { photoId: "123e4567-e89b-12d3-a456-426614174000", order: 1 },
      { photoId: "123e4567-e89b-12d3-a456-426614174001", order: 2 },
    ],
  })
  @IsArray()
  orderConfig: Array<{
    photoId: string;
    order: number;
  }>;
}

export class AdminSetPrimaryPhotoDto {
  @ApiProperty({
    description: "ID of the photo to set as primary",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsUUID("4")
  photoId: string;
}

export class AdminPhotoUploadDto {
  @ApiProperty({
    description: "Optional caption for the photo",
    example: "Main entrance view",
    required: false,
  })
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiProperty({
    description: "Whether the photo should be set as primary",
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
