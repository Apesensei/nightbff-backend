import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user.entity";

export enum AgeVerificationStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

@Entity("age_verifications")
export class AgeVerification {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id" })
  userId: string;

  @OneToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "onfido_applicant_id", nullable: true })
  onfidoApplicantId: string;

  @Column({ name: "onfido_check_id", nullable: true })
  onfidoCheckId: string;

  @Column({
    type: "text",
    enum: AgeVerificationStatus,
    // Temporarily remove default to test SQLite issue
    // default: AgeVerificationStatus.PENDING,
  })
  status: AgeVerificationStatus;

  @Column({ name: "document_type", nullable: true })
  documentType: string;

  @Column({
    name: "created_at",
  })
  @CreateDateColumn()
  createdAt: Date;

  @Column({
    name: "updated_at",
  })
  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ name: "verified_at", nullable: true })
  verifiedAt: Date;

  @Column({ name: "rejection_reason", nullable: true })
  rejectionReason: string;
}
