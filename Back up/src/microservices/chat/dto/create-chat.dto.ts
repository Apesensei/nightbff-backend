import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from "class-validator";
import { ChatType } from "../entities/chat.entity";

export class CreateChatDto {
  @IsEnum(ChatType)
  @IsNotEmpty()
  type: ChatType;

  @IsArray()
  @IsUUID("4", { each: true })
  @ValidateIf((o) => o.type === ChatType.DIRECT || o.type === ChatType.GROUP)
  participantIds: string[];

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsUUID("4")
  @ValidateIf((o) => o.type === ChatType.EVENT)
  eventId?: string;
}
