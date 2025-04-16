import { IsString, IsUUID, IsOptional, IsEnum, Length } from "class-validator";
import { RelationshipType } from "../entities/user-relationship.entity";

export class ConnectionRequestDto {
  @IsUUID()
  recipientId: string;

  @IsEnum(RelationshipType)
  @IsOptional()
  type?: RelationshipType = RelationshipType.PENDING;

  @IsString()
  @IsOptional()
  @Length(0, 500, { message: "Message cannot exceed 500 characters" })
  message?: string;
}
