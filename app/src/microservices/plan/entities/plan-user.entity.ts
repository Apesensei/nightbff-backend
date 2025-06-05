import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Plan } from "./plan.entity"; // Import Plan entity for relation

@Entity("plan_users")
@Index(["planId", "userId"], { unique: true }) // Composite unique index
export class PlanUser {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  planId: string;

  @Index() // Index userId individually as well for potential lookups
  @Column({ type: "varchar" })
  userId: string; // Assuming userId is string (e.g., from Auth0)

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt: Date;

  // --- Relations ---
  @ManyToOne(() => Plan, { onDelete: "CASCADE" }) // Cascade delete if Plan is deleted
  @JoinColumn({ name: "planId" })
  plan: Plan;
}
