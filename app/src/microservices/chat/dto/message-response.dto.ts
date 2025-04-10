import { Exclude, Expose, Type } from "class-transformer";
import { MessageType, MessageStatus } from "../entities/message.entity";

@Exclude()
export class MessageResponseDto {
  @Expose()
  id: string;

  @Expose()
  chatId: string;

  @Expose()
  senderId: string;

  @Expose()
  senderName?: string;

  @Expose()
  type: MessageType;

  @Expose()
  content?: string;

  @Expose()
  mediaUrl?: string;

  @Expose()
  locationLatitude?: number;

  @Expose()
  locationLongitude?: number;

  @Expose()
  status: MessageStatus;

  @Expose()
  isEdited: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<MessageResponseDto>) {
    Object.assign(this, partial);
  }
}
