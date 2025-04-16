import { IsEnum, IsNotEmpty, IsUUID } from "class-validator";
import { MessageStatus } from "../entities/message.entity";

export class UpdateMessageStatusDto {
  @IsUUID()
  @IsNotEmpty()
  messageId: string;

  @IsEnum(MessageStatus)
  @IsNotEmpty()
  status: MessageStatus;

  constructor(partial: Partial<UpdateMessageStatusDto>) {
    Object.assign(this, partial);
  }
}
