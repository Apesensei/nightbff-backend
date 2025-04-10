import { Exclude, Expose, Transform, Type } from "class-transformer";
import { MessageResponseDto } from "./message-response.dto";
import { ChatType } from "../entities/chat.entity";

export class ParticipantDto {
  id: string;
  username: string;
  displayName: string;
  photoURL?: string;
  isOnline?: boolean;
}

@Exclude()
export class ChatResponseDto {
  @Expose()
  id: string;

  @Expose()
  type: ChatType;

  @Expose()
  title?: string;

  @Expose()
  imageUrl?: string;

  @Expose()
  @Type(() => ParticipantDto)
  participants: ParticipantDto[];

  @Expose()
  eventId?: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  lastActivityAt?: Date;

  @Expose()
  @Type(() => MessageResponseDto)
  lastMessage?: MessageResponseDto;

  @Expose()
  unreadCount: number;

  @Expose()
  isActive: boolean;

  constructor(partial: Partial<ChatResponseDto>) {
    Object.assign(this, partial);
  }
}
