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

@Entity("venue_reviews")
export class VenueReview {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "venue_id" })
  venueId: string;

  @ManyToOne(() => Venue, (venue) => venue.reviews, { onDelete: "CASCADE" })
  @JoinColumn({ name: "venue_id" })
  venue: Venue;

  @Column({ name: "user_id" })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ type: "int" })
  rating: number;

  @Column({ nullable: true })
  review: string;

  @Column({ name: "is_verified_visit", default: false })
  isVerifiedVisit: boolean;

  @Column({ name: "upvote_count", default: 0 })
  upvoteCount: number;

  @Column({ name: "downvote_count", default: 0 })
  downvoteCount: number;

  @Column({ name: "is_published", default: true })
  isPublished: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
