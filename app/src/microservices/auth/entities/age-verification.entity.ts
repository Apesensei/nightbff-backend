import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
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
    type: "enum",
    enum: AgeVerificationStatus,
    default: AgeVerificationStatus.PENDING,
  })
  status: AgeVerificationStatus;

  @Column({ name: "document_type", nullable: true })
  documentType: string;

  @Column({
    name: "created_at",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt: Date;

  @Column({
    name: "updated_at",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
    onUpdate: "CURRENT_TIMESTAMP",
  })
  updatedAt: Date;

  @Column({ name: "verified_at", type: "timestamp", nullable: true })
  verifiedAt: Date;

  @Column({ name: "rejection_reason", nullable: true })
  rejectionReason: string;
}
