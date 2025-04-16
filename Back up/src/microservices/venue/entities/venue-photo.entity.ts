import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Venue } from "./venue.entity";
import { User } from "../../auth/entities/user.entity";

export enum VenuePhotoStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  PENDING = "pending",
}

export type PhotoSource = "google" | "admin" | "user";

@Entity("venue_photos")
export class VenuePhoto {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "venue_id" })
  venueId: string;

  @ManyToOne(() => Venue, (venue) => venue.venuePhotos, { onDelete: "CASCADE" })
  @JoinColumn({ name: "venue_id" })
  venue: Venue;

  @Column({ name: "user_id", nullable: true })
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "photo_url" })
  photoUrl: string;

  @Column({ name: "thumbnail_url", nullable: true })
  thumbnailUrl: string;

  @Column({ name: "medium_url", nullable: true })
  mediumUrl: string;

  @Column({ name: "large_url", nullable: true })
  largeUrl: string;

  @Column({ nullable: true })
  etag: string;

  @Column({ nullable: true })
  caption: string;

  @Column({ name: "is_primary", default: false })
  isPrimary: boolean;

  @Column({ name: "is_approved", default: true })
  isApproved: boolean;

  @Column({ default: 0 })
  order: number;

  @Column({
    name: "source",
    type: "enum",
    enum: ["google", "admin", "user"],
    default: "user",
  })
  source: PhotoSource;

  @Column({
    type: "text",
    enum: VenuePhotoStatus,
    default: VenuePhotoStatus.ACTIVE,
  })
  status: VenuePhotoStatus;

  @CreateDateColumn({ name: "created_at", type: "timestamp with time zone" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamp with time zone" })
  updatedAt: Date;
}
