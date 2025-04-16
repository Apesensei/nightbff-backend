import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  Unique,
} from "typeorm";
import { User } from "../../auth/entities/user.entity";
import { Interest } from "./interest.entity";

@Entity("user_interests")
@Unique(["userId", "interestId"])
export class UserInterest {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id" })
  @Index()
  userId: string;

  @Column({ name: "interest_id" })
  @Index()
  interestId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Interest, { onDelete: "CASCADE" })
  @JoinColumn({ name: "interest_id" })
  interest: Interest;

  @CreateDateColumn({ name: "created_at", type: "timestamp with time zone" })
  createdAt: Date;
}
