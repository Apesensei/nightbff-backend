import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToMany,
  OneToMany,
} from "typeorm";
import { User } from "../../auth/entities/user.entity";
import { UserInterest } from "./user-interest.entity";
import { EventInterest } from "./event-interest.entity";

@Entity("interests")
export class Interest {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "name", unique: true })
  @Index()
  name: string;

  @Column({ name: "icon" })
  icon: string; // Emoji string or asset path

  @Column({ name: "description", nullable: true })
  description?: string;

  @Column({ name: "is_icon_emoji", default: true })
  isIconEmoji: boolean; // Flag to differentiate between emoji and image asset

  @Column({ name: "image_url", nullable: true })
  imageUrl?: string; // For interests that use image assets instead of emojis

  @Column({ name: "usage_count", default: 0 })
  usageCount: number;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  @Column({ name: "sort_order", default: 0 })
  @Index()
  sortOrder: number; // For admin-controlled ordering

  @Column({ name: "icon_url", nullable: true })
  iconUrl: string;

  @ManyToMany(
    () => User,
    (user) => user.interests, // Assuming 'interests' relation exists on User
  )
  users: User[];

  @OneToMany(() => UserInterest, (userInterest) => userInterest.interest)
  userInterests: UserInterest[];

  @OneToMany(() => EventInterest, (eventInterest) => eventInterest.interest)
  eventInterests: EventInterest[];

  @CreateDateColumn({ name: "created_at", type: "timestamp with time zone" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamp with time zone" })
  updatedAt: Date;
}
