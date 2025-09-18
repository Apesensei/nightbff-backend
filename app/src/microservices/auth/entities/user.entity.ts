/**
 * User Entity
 *
 * This is the canonical User entity used across the application for authentication
 * and core user data. It is owned by the auth module but shared with other modules
 * through proper dependency injection (via AuthModule).
 *
 * It contains core identity, authentication details, status, roles, and basic
 * profile information shared across multiple domains (like display name, bio).
 *
 * Relations:
 * - OneToOne with AgeVerification (defined here)
 * - OneToOne with UserProfile (defined in UserProfile entity, user module)
 * - OneToMany with Chat (participants) (defined in Chat entity, chat module)
 * - OneToMany with Message (sender) (defined in Message entity, chat module)
 * - OneToMany with UserInterest (defined in UserInterest entity, interest module)
 * - OneToMany with Follow (follower/following) (defined in Follow entity, user module)
 * - OneToMany with ProfileView (viewer/viewed) (defined in ProfileView entity, user module)
 * - ... potentially others
 */
import {
  Column,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
} from "typeorm";
import { AgeVerification } from "./age-verification.entity";
import * as bcrypt from 'bcrypt';

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
}

export enum UserRole {
  USER = "user",
  ADMIN = "admin",
  VENUE_OWNER = "venue_owner",
  MODERATOR = "moderator",
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  username: string;

  @Column({ name: "display_name" })
  displayName: string;

  @Column({ name: "password_hash", select: false })
  passwordHash: string;

  @Column({ name: "photo_url", nullable: true })
  photoURL?: string;

  @Column({ nullable: true })
  bio?: string;

  @Column({ type: "simple-array", nullable: true })
  interests?: string[];

  @Column({ name: "is_verified", default: false })
  isVerified: boolean;

  @Column({ name: "is_premium", default: false })
  isPremium: boolean;

  @Column({ name: "is_age_verified", default: false })
  isAgeVerified: boolean;

  @Column({ name: "is_online", default: false })
  isOnline: boolean;

  @Column({ name: "location_latitude", type: "float", nullable: true })
  locationLatitude?: number;

  @Column({ name: "location_longitude", type: "float", nullable: true })
  locationLongitude?: number;

  @Column({
    type: "text",
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({
    name: "roles",
    type: "simple-array",
    default: UserRole.USER,
  })
  roles: string[];

  @CreateDateColumn({
    name: "created_at",
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: "updated_at",
  })
  updatedAt: Date;

  @OneToOne(
    () => AgeVerification,
    (ageVerification: AgeVerification) => ageVerification.user,
  )
  ageVerification: AgeVerification;

  // Helper method to get location as an object
  get location() {
    if (this.locationLatitude && this.locationLongitude) {
      return {
        latitude: this.locationLatitude,
        longitude: this.locationLongitude,
      };
    }
    return null;
  }

  // Helper method to set location as an object
  set location(locationData: { latitude: number; longitude: number } | null) {
    if (locationData) {
      this.locationLatitude = locationData.latitude;
      this.locationLongitude = locationData.longitude;
    } else {
      this.locationLatitude = undefined;
      this.locationLongitude = undefined;
    }
  }

  /**
   * Hash password before inserting or updating user
   * Only hash if password is not already hashed (doesn't start with $2b$)
   */
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.passwordHash && !this.passwordHash.startsWith('$2b$')) {
      this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
    }
  }

  /**
   * Validate password against stored hash
   * @param password - Plain text password to validate
   * @returns Promise<boolean> - True if password matches
   */
  async validatePassword(password: string): Promise<boolean> {
    if (!this.passwordHash) {
      return false;
    }
    return bcrypt.compare(password, this.passwordHash);
  }
}
