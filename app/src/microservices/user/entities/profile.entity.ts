import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  JoinColumn,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../auth/entities/user.entity";

export enum Gender {
  MALE = "male",
  FEMALE = "female",
  NON_BINARY = "non_binary",
  OTHER = "other",
  PREFER_NOT_TO_SAY = "prefer_not_to_say",
}

@Entity("profiles")
export class Profile {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id" })
  userId: string;

  @OneToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ nullable: true })
  bio: string;

  @Column({ type: "enum", enum: Gender, nullable: true })
  gender: Gender;

  @Column({ nullable: true })
  birthday: Date;

  @Column({ name: "favorite_venues", type: "simple-array", nullable: true })
  favoriteVenues: string[];

  @Column({ name: "profile_cover_url", nullable: true })
  profileCoverUrl: string;

  @Column({ name: "social_instagram", nullable: true })
  socialInstagram: string;

  @Column({ name: "social_twitter", nullable: true })
  socialTwitter: string;

  @Column({ name: "social_tiktok", nullable: true })
  socialTiktok: string;

  @Column({ name: "is_public", default: true })
  isPublic: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
