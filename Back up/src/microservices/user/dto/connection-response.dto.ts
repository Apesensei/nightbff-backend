import { IsString, IsUUID, IsOptional, IsEnum, Length } from "class-validator";

export enum ConnectionResponseStatus {
  ACCEPT = "accept",
  DECLINE = "decline",
}

export class ConnectionResponseDto {
  @IsUUID()
  relationshipId: string;

  @IsEnum(ConnectionResponseStatus)
  status: ConnectionResponseStatus;

  @IsString()
  @IsOptional()
  @Length(0, 500, { message: "Message cannot exceed 500 characters" })
  message?: string;
}
