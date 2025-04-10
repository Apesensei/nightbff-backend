import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from "typeorm";
import { User } from "../../auth/entities/user.entity";
import { Chat } from "./chat.entity";

export enum MessageType {
  TEXT = "text",
  IMAGE = "image",
  LOCATION = "location",
}

export enum MessageStatus {
  SENT = "sent",
  DELIVERED = "delivered",
  READ = "read",
}

@Entity("messages")
@Index(["chatId", "createdAt"])
export class Message {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "chat_id" })
  chatId: string;

  @ManyToOne(() => Chat, { onDelete: "CASCADE" })
  @JoinColumn({ name: "chat_id" })
  chat: Chat;

  @Column({ name: "sender_id" })
  senderId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "sender_id" })
  sender: User;

  @Column({
    type: "enum",
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Column({ type: "text", nullable: true })
  content?: string;

  @Column({ name: "media_url", nullable: true })
  mediaUrl?: string;

  @Column({ name: "location_latitude", type: "float", nullable: true })
  locationLatitude?: number;

  @Column({ name: "location_longitude", type: "float", nullable: true })
  locationLongitude?: number;

  @Column({
    type: "enum",
    enum: MessageStatus,
    default: MessageStatus.SENT,
  })
  status: MessageStatus;

  @Column({ name: "is_edited", default: false })
  isEdited: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @DeleteDateColumn({ name: "deleted_at", nullable: true })
  deletedAt?: Date;
}
