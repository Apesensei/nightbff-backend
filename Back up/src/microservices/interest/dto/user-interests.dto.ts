import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsNotEmpty, IsUUID, ArrayMaxSize } from "class-validator";

export class UserInterestsDto {
  @ApiProperty({
    description: "Array of interest IDs to associate with the user",
    example: [
      "123e4567-e89b-12d3-a456-426614174000",
      "123e4567-e89b-12d3-a456-426614174001",
    ],
    type: [String],
  })
  @IsArray()
  @IsNotEmpty({ each: true })
  @IsUUID("4", { each: true, message: "Each interest ID must be a valid UUID" })
  @ArrayMaxSize(20, { message: "A user can have at most 20 interests" })
  interestIds: string[];
}
