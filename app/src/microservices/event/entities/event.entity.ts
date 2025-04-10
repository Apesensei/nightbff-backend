import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from "typeorm";
import { EventVisibility } from "../enums/event-visibility.enum";

@Entity("events")
export class Event {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 60 }) // Character limit as per UI requirements
  @Index() // Add index for title searches
  title: string;

  @Column("text")
  description: string;

  @Column()
  @Index() // Add index for filtering by creator
  creatorId: string;

  @Column({ nullable: true })
  @Index() // Add index for filtering by venue
  venueId?: string;

  @Column({ nullable: true })
  customLocation?: string;

  @Column({ type: "timestamp with time zone" })
  @Index() // Add index for date filtering
  startTime: Date;

  @Column({ type: "timestamp with time zone", nullable: true })
  endTime?: Date;

  @Column({ nullable: true })
  coverImage?: string;

  @Column({ nullable: true })
  attendeeLimit?: number;

  @Column({
    type: "enum",
    enum: EventVisibility,
    default: EventVisibility.PUBLIC,
  })
  @Index() // Add index for visibility filtering
  visibility: EventVisibility;

  @Column({ default: false })
  requireApproval: boolean;

  @Column({ type: "float", default: 0 })
  @Index() // Add index for sorting by trending score
  trendingScore: number;

  @Column({ type: "integer", default: 0 })
  viewCount: number;

  @OneToMany("EventAttendee", "event", { cascade: true })
  attendees: any[]; // Will be typed as EventAttendee[] at runtime

  @CreateDateColumn({ type: "timestamp with time zone" })
  @Index() // Add index for sorting by creation date
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updatedAt: Date;

  // We'll add these as actual relations once we have the repository implementations
  // @ManyToOne(() => User, user => user.createdEvents)
  // @JoinColumn({ name: 'creatorId' })
  // creator: User;

  // @ManyToOne(() => Venue, venue => venue.events, { nullable: true })
  // @JoinColumn({ name: 'venueId' })
  // venue?: Venue;
}
