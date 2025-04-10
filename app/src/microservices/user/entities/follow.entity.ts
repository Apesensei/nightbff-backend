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

  @Column({ type: "enum", enum: FollowType })
  @Index()
  type: FollowType; // Type of entity being followed (user or venue)

  @Column({ nullable: true }) // Only populated if type is USER
  @Index()
  followedUserId?: string;

  @Column({ nullable: true }) // Only populated if type is VENUE
  @Index()
  followedVenueId?: string; // Link to Venue.id

  @CreateDateColumn()
  createdAt: Date;
}
