import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from "class-validator";
import { MessageType } from "../entities/message.entity";

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
