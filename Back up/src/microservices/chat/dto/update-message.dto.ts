import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class UpdateMessageDto {
  @IsUUID()
  @IsNotEmpty()
  messageId: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  mediaUrl?: string;

  constructor(partial: Partial<UpdateMessageDto>) {
    Object.assign(this, partial);
  }
}
