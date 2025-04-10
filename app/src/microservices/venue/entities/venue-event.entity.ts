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

export enum EventStatus {
  SCHEDULED = "scheduled",
  ACTIVE = "active",
  CANCELED = "canceled",
  COMPLETED = "completed",
}

@Entity("venue_events")
export class VenueEvent {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "venue_id" })
  venueId: string;

  @ManyToOne(() => Venue, (venue) => venue.events, { onDelete: "CASCADE" })
  @JoinColumn({ name: "venue_id" })
  venue: Venue;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ name: "start_time", type: "timestamp" })
  startTime: Date;

  @Column({ name: "end_time", type: "timestamp" })
  endTime: Date;

  @Column({ name: "image_url", nullable: true })
  imageUrl: string;

  @Column({ nullable: true })
  url: string;

  @Column({ name: "is_featured", default: false })
  isFeatured: boolean;

  @Column({ nullable: true })
  price: string;

  @Column({
    name: "status",
    type: "enum",
    enum: EventStatus,
    default: EventStatus.SCHEDULED,
  })
  status: EventStatus;

  @Column({ name: "attendee_count", default: 0 })
  attendeeCount: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
