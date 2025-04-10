import {
  IsString,
  IsUUID,
  IsOptional,
  IsBoolean,
  Length,
} from "class-validator";

export class BlockUserDto {
  @IsUUID()
  userId: string;

  @IsString()
  @IsOptional()
  @Length(0, 1000, { message: "Reason cannot exceed 1000 characters" })
  reason?: string;

  @IsBoolean()
  @IsOptional()
  report?: boolean = false;
}
