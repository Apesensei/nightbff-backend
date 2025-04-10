import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { Event } from "./event.entity";
import { EventAttendeeStatus } from "../enums/event-attendee-status.enum";

@Entity("event_attendees")
@Index(["eventId", "userId"], { unique: true })
export class EventAttendee {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column()
  @Index()
  eventId: string;

  @Column({
    type: "enum",
    enum: EventAttendeeStatus,
    default: EventAttendeeStatus.INVITED,
  })
  @Index()
  status: EventAttendeeStatus;

  @CreateDateColumn({ type: "timestamp with time zone" })
  @Index()
  joinedAt: Date;

  @ManyToOne("Event", "attendees", { onDelete: "CASCADE" })
  @JoinColumn({ name: "eventId" })
  event: Event;

  // We'll add this relation once User entity is available
  // @ManyToOne(() => User, user => user.eventAttendees)
  // @JoinColumn({ name: 'userId' })
  // user: User;
}
