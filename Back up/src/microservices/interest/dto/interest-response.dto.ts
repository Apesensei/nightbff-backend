import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Interest } from "../entities/interest.entity";

export class InterestResponseDto {
  @ApiProperty({
    description: "Unique identifier for the interest",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  id: string;

  @ApiProperty({
    description: "Name of the interest",
    example: "Hiking",
  })
  name: string;

  @ApiProperty({
    description: "Icon for the interest, either emoji or asset path",
    example: "🥾",
  })
  icon: string;

  @ApiProperty({
    description: "Whether the icon is an emoji (true) or an asset path (false)",
    example: true,
  })
  isIconEmoji: boolean;

  @ApiPropertyOptional({
    description: "Description of the interest",
    example: "Activities related to hiking and outdoor trails",
  })
  description?: string;

  @ApiPropertyOptional({
    description: "URL to an image representing the interest",
    example: "https://example.com/images/hiking.jpg",
  })
  imageUrl?: string;

  @ApiProperty({
    description: "Whether the interest is active and should be shown to users",
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description:
      "The sort order for displaying this interest (lower values first)",
    example: 10,
  })
  sortOrder: number;

  @ApiPropertyOptional({
    description: "Number of times this interest has been used",
    example: 1250,
  })
  usageCount?: number;

  @ApiProperty({
    description: "When the interest was created",
    example: "2023-01-01T00:00:00Z",
  })
  createdAt: Date;

  @ApiProperty({
    description: "When the interest was last updated",
    example: "2023-01-15T00:00:00Z",
  })
  updatedAt: Date;

  /**
   * Static method to create a DTO from an entity
   */
  static fromEntity(interest: Interest): InterestResponseDto {
    const dto = new InterestResponseDto();
    dto.id = interest.id;
    dto.name = interest.name;
    dto.icon = interest.icon;
    dto.description = interest.description;
    dto.isIconEmoji = interest.isIconEmoji;
    dto.imageUrl = interest.imageUrl;
    dto.isActive = interest.isActive;
    dto.sortOrder = interest.sortOrder;
    dto.usageCount = interest.usageCount;
    dto.createdAt = interest.createdAt;
    dto.updatedAt = interest.updatedAt;
    return dto;
  }
}
