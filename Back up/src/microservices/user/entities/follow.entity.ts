import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
  Index,
} from "typeorm";

export enum FollowType {
  USER = "user",
  VENUE = "venue",
}

@Entity("follows")
// Add unique constraint for user + followed entity (either user or venue)
@Unique("UQ_user_follow", ["userId", "followedUserId", "followedVenueId"])
export class Follow {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  @Index()
  userId: string; // ID of the user performing the follow action

  @Column({ name: "following_id" })
  followingId: string;

  @Column({ type: "text" }) // Changed from string to text
  type: FollowType;

  @Column({ nullable: true }) // Only populated if type is USER
  @Index()
  followedUserId?: string;

  @Column({ nullable: true }) // Only populated if type is VENUE
  @Index()
  followedVenueId?: string; // Link to Venue.id

  @CreateDateColumn({ name: "created_at", type: "timestamp with time zone" })
  createdAt: Date;
}
