import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  Unique,
} from "typeorm";
import { Event } from "../../event/entities/event.entity";
import { Interest } from "./interest.entity";

@Entity("event_interests")
@Unique(["eventId", "interestId"])
export class EventInterest {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "event_id" })
  @Index()
  eventId: string;

  @Column({ name: "interest_id" })
  @Index()
  interestId: string;

  @ManyToOne(() => Event, { onDelete: "CASCADE" })
  @JoinColumn({ name: "event_id" })
  event: Event;

  @ManyToOne(() => Interest, { onDelete: "CASCADE" })
  @JoinColumn({ name: "interest_id" })
  interest: Interest;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
