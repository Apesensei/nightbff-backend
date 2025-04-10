import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { AgeVerification } from "./age-verification.entity";

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
    type: "enum",
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
}
