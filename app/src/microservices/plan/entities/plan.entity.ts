import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { City } from "./city.entity"; // Import City entity for relation

@Entity("plans")
export class Plan {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ type: "varchar" }) // Assuming userId is string (e.g., from Auth0)
  creatorId: string;

  @Index()
  @Column({ type: "uuid" })
  cityId: string;

  @Index()
  @Column({ type: "uuid", nullable: true })
  venueId?: string; // Assuming venueId is UUID

  @Column({ type: "timestamp with time zone" })
  startDate: Date;

  @Column({ type: "timestamp with time zone", nullable: true })
  endDate?: Date;

  @Column({ type: "varchar", length: 2048, nullable: true })
  coverImage?: string;

  @Column({ type: "integer", default: 0 })
  saveCount: number;

  @Column({ type: "integer", default: 0 })
  viewCount: number;

  @Index()
  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updatedAt: Date;

  // --- Relations ---
  @ManyToOne(() => City, { eager: true }) // Eager load City details with Plan
  @JoinColumn({ name: "cityId" })
  city: City;
}
