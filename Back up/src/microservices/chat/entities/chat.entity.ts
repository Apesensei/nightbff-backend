import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from "typeorm";
import { Message } from "./message.entity";
import { User } from "../../auth/entities/user.entity";

export enum ChatType {
  DIRECT = "DIRECT",
  GROUP = "GROUP",
  EVENT = "EVENT",
}

@Entity()
export class Chat {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    type: "text",
    enum: ChatType,
    default: ChatType.DIRECT,
  })
  type: ChatType;

  @Column({ nullable: true })
  title: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ nullable: true })
  creatorId: string;

  @Column({ nullable: true })
  eventId: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({
    /* type: 'timestamp with time zone' */
  })
  createdAt: Date;

  @UpdateDateColumn({
    /* type: 'timestamp with time zone' */
  })
  updatedAt: Date;

  @Column({ nullable: true /* type: 'timestamp with time zone' */ })
  lastActivityAt: Date;

  @OneToMany(() => Message, (message) => message.chat)
  messages: Message[];

  @ManyToMany(() => User)
  @JoinTable({
    name: "chat_participants",
    joinColumn: { name: "chatId", referencedColumnName: "id" },
    inverseJoinColumn: { name: "userId", referencedColumnName: "id" },
  })
  participants: User[];
}
