import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  ValidateIf,
} from "class-validator";
import { MessageType } from "../entities/message.entity";

export class SendMessageDto {
  @IsUUID("4")
  @IsNotEmpty()
  chatId: string;

  @IsEnum(MessageType)
  @IsNotEmpty()
  type: MessageType;

  @IsString()
  @ValidateIf((o) => o.type === MessageType.TEXT)
  @IsNotEmpty()
  content?: string;

  @IsString()
  @ValidateIf((o) => o.type === MessageType.IMAGE)
  @IsNotEmpty()
  mediaUrl?: string;

  @IsNumber()
  @IsLatitude()
  @ValidateIf((o) => o.type === MessageType.LOCATION)
  @IsNotEmpty()
  locationLatitude?: number;

  @IsNumber()
  @IsLongitude()
  @ValidateIf((o) => o.type === MessageType.LOCATION)
  @IsNotEmpty()
  locationLongitude?: number;
}
