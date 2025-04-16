import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  MaxLength,
  IsUrl,
  ValidateIf,
} from "class-validator";

export class CreateInterestDto {
  @ApiProperty({
    description: "The name of the interest",
    example: "Hiking",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiProperty({
    description: "The icon for the interest, can be emoji or asset path",
    example: "🥾",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  icon: string;

  @ApiPropertyOptional({
    description: "Whether the icon is an emoji (true) or an asset path (false)",
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isIconEmoji?: boolean;

  @ApiPropertyOptional({
    description: "Optional description of the interest",
    example: "Activities related to hiking and outdoor trails",
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: "URL to an image representing the interest",
    example: "https://example.com/images/hiking.jpg",
  })
  @IsUrl()
  @IsOptional()
  @ValidateIf((o) => o.isIconEmoji === false)
  imageUrl?: string;

  @ApiPropertyOptional({
    description: "Whether the interest is active and should be shown to users",
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description:
      "The sort order for displaying this interest (lower values first)",
    example: 10,
  })
  @IsOptional()
  sortOrder?: number;
}
