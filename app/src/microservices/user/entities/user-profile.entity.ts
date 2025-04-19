/**
 * User Profile Entity
 *
 * Stores extended profile information for a User, complementing the canonical
 * User entity located in the auth module.
 *
 * This entity holds data specific to the user's public-facing profile,
 * preferences, and attributes not directly related to authentication or core identity.
 *
 * Relations:
 * - OneToOne with User (auth module) via the `userId` foreign key.
 */
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "../../auth/entities/user.entity"; // Import the correct User entity

// Add the Gender enum definition
export enum Gender {
  MALE = "male",
  FEMALE = "female",
  OTHER = "other", // Final state includes only these three
  // PREFER_NOT_TO_SAY = "prefer_not_to_say", // Removed
}

// Define GenderPreference enum
export enum GenderPreference {
  MALE = "male",
  FEMALE = "female",
  BOTH = "both",
}

@Entity("user_profiles")
export class UserProfile {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  // Explicitly define the foreign key column
  @Column()
  userId: string;

  // Define the relationship using the foreign key
  @OneToOne(() => User)
  @JoinColumn({ name: "userId" }) // Specify the join column name matches the FK field
  user: User;

  // --- Fields moved from the old user/entities/user.entity.ts ---

  @Column({ nullable: true })
  country?: string; // Made optional as it was nullable

  @Column({ nullable: true, type: "timestamp with time zone" })
  @Index()
  lastActiveAt?: Date; // Made optional as it was nullable

  // Add the gender field using the enum
  @Column({ type: "enum", enum: Gender, nullable: true })
  gender?: Gender;

  // --- Additional Profile fields found during refactoring ---
  @Column({ name: "profile_cover_url", nullable: true })
  profileCoverUrl?: string;

  @Column({ name: "is_public", default: true }) // Defaulting to public, adjust if needed
  isPublic: boolean;

  @Column({ nullable: true, type: "timestamp with time zone" })
  birthDate?: Date;

  // --- New Preference Fields ---
  @Column({
    type: "enum",
    enum: GenderPreference,
    nullable: true, // Nullable initially as existing users won't have this set
    name: "gender_preference",
  })
  genderPreference?: GenderPreference;

  @Column({
    type: "int",
    nullable: true, // Nullable initially
    name: "min_age_preference",
  })
  minAgePreference?: number;

  @Column({
    type: "int",
    nullable: true, // Nullable initially
    name: "max_age_preference",
  })
  maxAgePreference?: number;

  // --- Standard Timestamps ---
  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updatedAt: Date;
}
