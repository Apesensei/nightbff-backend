import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

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

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
