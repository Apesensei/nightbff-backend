import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from "typeorm";
import { User } from "../../auth/entities/user.entity";

@Entity("profile_views")
@Index(["viewerId", "viewedId", "createdAt"])
export class ProfileView {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "viewer_id" })
  viewerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "viewer_id" })
  viewer: User;

  @Column({ name: "viewed_id" })
  viewedId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "viewed_id" })
  viewed: User;

  @Column({ default: true })
  anonymous: boolean;

  @Column({ name: "is_notified", default: false })
  isNotified: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
