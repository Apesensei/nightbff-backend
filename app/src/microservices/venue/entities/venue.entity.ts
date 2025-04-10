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

export type VenueVerificationStatus = "pending" | "approved" | "rejected";

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
    type: "enum",
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  })
  verificationStatus: VenueVerificationStatus;

  @Column({ nullable: true, length: 255 })
  website?: string;

  @Column({ nullable: true, length: 20 })
  phone?: string;

  @Column({ nullable: true })
  isOpenNow?: boolean;

  // Admin overrides - store fields modified by admins
  @Column({ type: "json", nullable: true })
  adminOverrides?: Record<string, any>;

  // Audit fields for tracking admin modifications
  @Column({ name: "last_modified_by", nullable: true })
  lastModifiedBy?: string;

  @Column({ name: "last_modified_at", type: "timestamp", nullable: true })
  lastModifiedAt?: Date;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
