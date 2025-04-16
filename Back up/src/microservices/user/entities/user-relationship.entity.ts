import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { User } from "../../auth/entities/user.entity";

export enum RelationshipType {
  PENDING = "pending",
  ACCEPTED = "accepted",
  FOLLOWING = "following",
  BLOCKED = "blocked",
}

export enum RelationshipDirection {
  OUTGOING = "outgoing",
  INCOMING = "incoming",
  MUTUAL = "mutual",
}

@Entity("user_relationships")
@Index(["requesterId", "recipientId"], { unique: true })
export class UserRelationship {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "requester_id" })
  requesterId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "requester_id" })
  requester: User;

  @Column({ name: "recipient_id" })
  recipientId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "recipient_id" })
  recipient: User;

  @Column({
    type: "text",
    enum: RelationshipType,
    default: RelationshipType.PENDING,
  })
  type: RelationshipType;

  @Column({ nullable: true })
  message?: string;

  @Column({ name: "is_reported", default: false })
  isReported: boolean;

  @Column({ name: "report_reason", nullable: true })
  reportReason?: string;

  @CreateDateColumn({ name: "created_at", type: "timestamp with time zone" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamp with time zone" })
  updatedAt: Date;
}
