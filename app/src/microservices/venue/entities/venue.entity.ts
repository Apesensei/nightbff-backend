import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
  Index,
} from "typeorm";
import { VenueType } from "./venue-type.entity";
import { VenueEvent } from "./venue-event.entity";
import { VenueHour } from "./venue-hour.entity";
import { VenueReview } from "./venue-review.entity";
import { VenuePhoto } from "./venue-photo.entity";

// Restore inline enum if it was here - Assuming it was for VenueStatus
export enum VenueStatus {
  PENDING = "pending",
  ACTIVE = "active",
  REJECTED = "rejected",
  CLOSED = "closed", // Add other statuses as needed
}

// export type VenueVerificationStatus = "pending" | "approved" | "rejected"; // Keeping previous type alias commented out

@Entity("venues")
export class Venue {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 500, nullable: true })
  description?: string;

  @Column({ length: 255 })
  address: string;

  @Column({ type: "decimal", precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: "decimal", precision: 10, scale: 7 })
  longitude: number;

  @Column({ nullable: true, length: 50 })
  googlePlaceId?: string;

  @Column({ type: "decimal", precision: 3, scale: 1, default: 0 })
  rating: number;

  @Column({ default: 0 })
  reviewCount: number;

  @Column({ default: 0 })
  popularity: number;

  @Column({ nullable: true, type: "smallint" })
  priceLevel?: number;

  @Column({ default: false })
  isFeatured: boolean;

  @Column({
    type: "text", // Keep type change
    enum: VenueStatus, // Use restored inline enum
    default: VenueStatus.PENDING,
  })
  status: VenueStatus;

  @Column({ nullable: true, length: 255 })
  website?: string;

  @Column({ nullable: true, length: 20 })
  phone?: string;

  @Column({ nullable: true })
  isOpenNow?: boolean;

  // Admin overrides - store fields modified by admins
  @Column({ type: "simple-json", nullable: true })
  adminOverrides?: Record<string, any>;

  // Audit fields for tracking admin modifications
  @Column({ name: "last_modified_by", nullable: true })
  lastModifiedBy?: string;

  @Column({ type: "timestamp with time zone", nullable: true })
  lastModifiedAt: Date;

  @ManyToMany(() => VenueType)
  @JoinTable({
    name: "venue_to_venue_type",
    joinColumn: { name: "venue_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "venue_type_id", referencedColumnName: "id" },
  })
  venueTypes: VenueType[];

  @OneToMany(() => VenueHour, (venueHour) => venueHour.venue)
  hours: VenueHour[];

  @OneToMany(() => VenueEvent, (venueEvent) => venueEvent.venue)
  events: VenueEvent[];

  @OneToMany(() => VenueReview, (venueReview) => venueReview.venue)
  reviews: VenueReview[];

  @OneToMany(() => VenuePhoto, (venuePhoto) => venuePhoto.venue)
  venuePhotos: VenuePhoto[];

  @Column({ nullable: true })
  googleRating?: number;

  @Column({ nullable: true })
  googleRatingsTotal?: number;

  // --- Start: Added fields for trending ---
  @Column({ type: "integer", default: 0 })
  viewCount: number;

  @Column({ type: "integer", default: 0 })
  followerCount: number;

  @Column({ type: "integer", default: 0 })
  associatedPlanCount: number; // Count of plans linked via venueId

  @Column({ type: "float", default: 0 })
  @Index() // Add index for sorting by trending score
  trendingScore: number;
  // --- End: Added fields for trending ---

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  @Column({ type: "simple-json", nullable: true })
  metadata: Record<string, any>;

  @Column({ type: "timestamp with time zone", nullable: true })
  lastRefreshed?: Date;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updatedAt: Date;
}
