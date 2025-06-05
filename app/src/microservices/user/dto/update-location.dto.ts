import { IsLatitude, IsLongitude } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateLocationDto {
  @ApiProperty({
    description: "User's latitude coordinate",
    example: 37.7749,
    minimum: -90,
    maximum: 90,
  })
  @IsLatitude()
  latitude: number;

  @ApiProperty({
    description: "User's longitude coordinate",
    example: -122.4194,
    minimum: -180,
    maximum: 180,
  })
  @IsLongitude()
  longitude: number;
}
