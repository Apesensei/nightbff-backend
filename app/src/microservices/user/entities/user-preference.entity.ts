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

export enum NotificationType {
  PUSH = "push",
  EMAIL = "email",
  SMS = "sms",
}

export enum ThemeMode {
  LIGHT = "light",
  DARK = "dark",
  SYSTEM = "system",
}

@Entity("user_preferences")
export class UserPreference {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id" })
  userId: string;

  @OneToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "notification_events_nearby", default: true })
  notificationEventsNearby: boolean;

  @Column({ name: "notification_friend_activity", default: true })
  notificationFriendActivity: boolean;

  @Column({ name: "notification_promotions", default: true })
  notificationPromotions: boolean;

  @Column({
    name: "notification_type",
    type: "enum",
    enum: NotificationType,
    default: NotificationType.PUSH,
  })
  notificationType: NotificationType;

  @Column({ name: "distance_unit", default: "miles" })
  distanceUnit: string;

  @Column({
    name: "theme_mode",
    type: "enum",
    enum: ThemeMode,
    default: ThemeMode.SYSTEM,
  })
  themeMode: ThemeMode;

  @Column({ name: "language", default: "en" })
  language: string;

  @Column({ name: "auto_checkin", default: false })
  autoCheckin: boolean;

  @Column({ name: "search_radius_mi", default: 10 })
  searchRadiusMi: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
