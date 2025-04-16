import { MigrationInterface, QueryRunner } from "typeorm";

export class CentralEntityRegistrationRefactor1744678494513
  implements MigrationInterface
{
  name = "CentralEntityRegistrationRefactor1744678494513";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "venue_events" DROP CONSTRAINT "FK_348a5c1b15e154a8b742fba6f78"`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_hours" DROP CONSTRAINT "FK_9107cc66d2e6c83621b3c301193"`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_reviews" DROP CONSTRAINT "FK_d84da26eed68ebf019b525e0612"`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_reviews" DROP CONSTRAINT "FK_a50659b13303f6fb5276ecb2ad1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "venues" DROP CONSTRAINT "FK_8cb5cf3df16fc75663f85b5b35c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" DROP CONSTRAINT "FK_8481388d6325e752cd4d7e26c6d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" DROP CONSTRAINT "FK_c621508a2b84ae21d3f971cdb47"`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" DROP CONSTRAINT "FK_0af7bb0535bc01f3c130cfe5fe7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_interests" DROP CONSTRAINT "FK_event_interests_event_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_interests" DROP CONSTRAINT "FK_event_interests_interest_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_interests" DROP CONSTRAINT "FK_user_interests_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_interests" DROP CONSTRAINT "FK_user_interests_interest_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_attendees" DROP CONSTRAINT "FK_07eb323a7b08ba51fe4b582f3f4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_participants" DROP CONSTRAINT "FK_e16675fae83bc603f30ae8fbdd5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_participants" DROP CONSTRAINT "FK_fb6add83b1a7acc94433d385692"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_venue_events_start_time"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_venue_events_venue_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_venue_hours_venue_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_venue_reviews_venue_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_venue_reviews_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_venue_reviews_rating"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_venue_location"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_venue_owner_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_venue_trending_score"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_venue_is_active"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_follow_userId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_follow_type"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_follow_followedUserId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_follow_followedVenueId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_events_title"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_events_creatorId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_events_venueId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_events_startTime"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_events_visibility"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_events_trendingScore"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_events_createdAt"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_event_interests_event_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_event_interests_interest_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_interests_name"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_interests_sort_order"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_user_interests_user_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_user_interests_interest_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_event_attendees_userId"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_event_attendees_eventId"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_event_attendees_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_event_attendees_joinedAt"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_chat_type"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_chat_creatorId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_chat_eventId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_chat_lastActivityAt"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_chat_participants_userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_interests" DROP CONSTRAINT "UQ_event_interests_event_id_interest_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_interests" DROP CONSTRAINT "UQ_user_interests_user_id_interest_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_attendees" DROP CONSTRAINT "UQ_event_attendees_eventId_userId"`,
    );
    await queryRunner.query(
      `CREATE TABLE "venue_types" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying, "icon_url" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_9c503e1b17f4cabbda5cc09b768" UNIQUE ("name"), CONSTRAINT "PK_225080d3c45297d563c3e03d190" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "age_verifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "onfido_applicant_id" character varying, "onfido_check_id" character varying, "status" text NOT NULL, "document_type" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "verified_at" TIMESTAMP, "rejection_reason" character varying, CONSTRAINT "REL_45f3f68779fe8837c84e04d0d8" UNIQUE ("user_id"), CONSTRAINT "PK_ac5c7c3b69a34f7d29ed3a1ab2d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."venue_photos_source_enum" AS ENUM('google', 'admin', 'user')`,
    );
    await queryRunner.query(
      `CREATE TABLE "venue_photos" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "venue_id" uuid NOT NULL, "user_id" uuid, "photo_url" character varying NOT NULL, "thumbnail_url" character varying, "medium_url" character varying, "large_url" character varying, "etag" character varying, "caption" character varying, "is_primary" boolean NOT NULL DEFAULT false, "is_approved" boolean NOT NULL DEFAULT true, "order" integer NOT NULL DEFAULT '0', "source" "public"."venue_photos_source_enum" NOT NULL DEFAULT 'user', "status" text NOT NULL DEFAULT 'active', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_dca6b49cd58236983f17e933e2a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_relationships" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "requester_id" uuid NOT NULL, "recipient_id" uuid NOT NULL, "type" text NOT NULL DEFAULT 'pending', "message" character varying, "is_reported" boolean NOT NULL DEFAULT false, "report_reason" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a9f4f64c43f6ec154dd602c47d8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_76339b03d3956dc40d478c8062" ON "user_relationships" ("requester_id", "recipient_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "user_preferences" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "notification_events_nearby" boolean NOT NULL DEFAULT true, "notification_friend_activity" boolean NOT NULL DEFAULT true, "notification_promotions" boolean NOT NULL DEFAULT true, "notification_type" text NOT NULL DEFAULT 'push', "distance_unit" character varying NOT NULL DEFAULT 'miles', "theme_mode" text NOT NULL DEFAULT 'system', "language" character varying NOT NULL DEFAULT 'en', "auto_checkin" boolean NOT NULL DEFAULT false, "search_radius_mi" integer NOT NULL DEFAULT '10', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "REL_458057fa75b66e68a275647da2" UNIQUE ("user_id"), CONSTRAINT "PK_e8cfb5b31af61cd363a6b6d7c25" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "profile_views" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "viewer_id" uuid NOT NULL, "viewed_id" uuid NOT NULL, "anonymous" boolean NOT NULL DEFAULT true, "is_notified" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d097089dc034d5c56a396ae2fd2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3d04da35452c848f4d0858f393" ON "profile_views" ("viewer_id", "viewed_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "chat_id" uuid NOT NULL, "sender_id" uuid NOT NULL, "type" text NOT NULL DEFAULT 'text', "content" text, "media_url" character varying, "location_latitude" double precision, "location_longitude" double precision, "status" text NOT NULL DEFAULT 'sent', "is_edited" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_366ea02dc46f24c57d225cbd79" ON "messages" ("chat_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "venue_to_venue_type" ("venue_id" uuid NOT NULL, "venue_type_id" uuid NOT NULL, CONSTRAINT "PK_9a07462f3d1a3a2751aa3b54ba4" PRIMARY KEY ("venue_id", "venue_type_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6957cf6f44eca92cda24bb063d" ON "venue_to_venue_type" ("venue_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c7bf5367acdfb1696ce3eace1e" ON "venue_to_venue_type" ("venue_type_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_events" DROP COLUMN "ticket_price"`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_events" DROP COLUMN "ticket_url"`,
    );
    await queryRunner.query(`ALTER TABLE "venue_events" DROP COLUMN "tags"`);
    await queryRunner.query(
      `ALTER TABLE "venue_events" DROP COLUMN "is_recurring"`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_events" DROP COLUMN "recurrence_pattern"`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_hours" DROP COLUMN "day_of_week"`,
    );
    await queryRunner.query(
      `ALTER TABLE "venues" DROP COLUMN "address_line_1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "venues" DROP COLUMN "address_line_2"`,
    );
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "city"`);
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "state"`);
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "postal_code"`);
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "country"`);
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "phone_number"`);
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "category"`);
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "capacity"`);
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "tags"`);
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "created_at"`);
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "updated_at"`);
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "owner_id"`);
    await queryRunner.query(
      `ALTER TABLE "venues" DROP COLUMN "cover_image_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "venues" DROP COLUMN "profile_image_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "venues" DROP COLUMN "entry_requirements"`,
    );
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "music_policy"`);
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "dress_code"`);
    await queryRunner.query(
      `ALTER TABLE "venues" DROP COLUMN "average_rating"`,
    );
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "review_count"`);
    await queryRunner.query(
      `ALTER TABLE "venues" DROP COLUMN "trending_score"`,
    );
    await queryRunner.query(`ALTER TABLE "follows" DROP COLUMN "createdAt"`);
    await queryRunner.query(
      `ALTER TABLE "venue_events" ADD "url" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_events" ADD "is_featured" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_events" ADD "price" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_events" ADD "status" text NOT NULL DEFAULT 'scheduled'`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_events" ADD "attendee_count" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_hours" ADD "dayOfWeek" text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_hours" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_hours" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "address" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "googlePlaceId" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "rating" numeric(3,1) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "reviewCount" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "popularity" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(`ALTER TABLE "venues" ADD "priceLevel" smallint`);
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "isFeatured" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "status" text NOT NULL DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "phone" character varying(20)`,
    );
    await queryRunner.query(`ALTER TABLE "venues" ADD "isOpenNow" boolean`);
    await queryRunner.query(`ALTER TABLE "venues" ADD "adminOverrides" text`);
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "last_modified_by" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "lastModifiedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(`ALTER TABLE "venues" ADD "googleRating" integer`);
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "googleRatingsTotal" integer`,
    );
    await queryRunner.query(`ALTER TABLE "venues" ADD "metadata" text`);
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "lastRefreshed" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_profiles_gender_enum" AS ENUM('male', 'female', 'other', 'prefer_not_to_say')`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ADD "gender" "public"."user_profiles_gender_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ADD "profile_cover_url" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ADD "is_public" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ADD "birthDate" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "follows" ADD "following_id" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "follows" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "interests" ADD "icon_url" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_events" DROP COLUMN "description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_events" ADD "description" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_events" ALTER COLUMN "end_time" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_hours" ALTER COLUMN "open_time" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_hours" ALTER COLUMN "close_time" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "bio"`);
    await queryRunner.query(`ALTER TABLE "users" ADD "bio" character varying`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "interests"`);
    await queryRunner.query(`ALTER TABLE "users" ADD "interests" text`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "status" text NOT NULL DEFAULT 'active'`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "roles"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "roles" text NOT NULL DEFAULT 'user'`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "created_at"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "updated_at"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "venue_reviews" DROP COLUMN "review"`);
    await queryRunner.query(
      `ALTER TABLE "venue_reviews" ADD "review" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "name"`);
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "name" character varying(100) NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "description"`);
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "description" character varying(500)`,
    );
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "latitude"`);
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "latitude" numeric(10,7) NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "longitude"`);
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "longitude" numeric(10,7) NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "website"`);
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "website" character varying(255)`,
    );
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "trendingScore"`);
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "trendingScore" double precision NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "follows" DROP CONSTRAINT "UQ_user_follow"`,
    );
    await queryRunner.query(`ALTER TABLE "follows" DROP COLUMN "userId"`);
    await queryRunner.query(
      `ALTER TABLE "follows" ADD "userId" character varying NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "follows" DROP COLUMN "type"`);
    await queryRunner.query(`DROP TYPE "public"."follows_type_enum"`);
    await queryRunner.query(`ALTER TABLE "follows" ADD "type" text NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "follows" DROP COLUMN "followedUserId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "follows" ADD "followedUserId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "follows" DROP COLUMN "followedVenueId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "follows" ADD "followedVenueId" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "creatorId"`);
    await queryRunner.query(
      `ALTER TABLE "events" ADD "creatorId" character varying NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "venueId"`);
    await queryRunner.query(
      `ALTER TABLE "events" ADD "venueId" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "startTime"`);
    await queryRunner.query(
      `ALTER TABLE "events" ADD "startTime" TIMESTAMP NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "endTime"`);
    await queryRunner.query(`ALTER TABLE "events" ADD "endTime" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "visibility"`);
    await queryRunner.query(`DROP TYPE "public"."events_visibility_enum"`);
    await queryRunner.query(
      `ALTER TABLE "events" ADD "visibility" text NOT NULL DEFAULT 'public'`,
    );
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "createdAt"`);
    await queryRunner.query(
      `ALTER TABLE "events" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "updatedAt"`);
    await queryRunner.query(
      `ALTER TABLE "events" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_interests" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "interests" DROP COLUMN "description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interests" ADD "description" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "interests" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "interests" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_interests" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_attendees" DROP COLUMN "userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_attendees" ADD "userId" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_attendees" DROP COLUMN "status"`,
    );
    await queryRunner.query(`DROP TYPE "public"."event_attendees_status_enum"`);
    await queryRunner.query(
      `ALTER TABLE "event_attendees" ADD "status" text NOT NULL DEFAULT 'invited'`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_attendees" DROP COLUMN "joinedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_attendees" ADD "joinedAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "chat" DROP COLUMN "type"`);
    await queryRunner.query(
      `ALTER TABLE "chat" ADD "type" text NOT NULL DEFAULT 'DIRECT'`,
    );
    await queryRunner.query(`ALTER TABLE "chat" DROP COLUMN "creatorId"`);
    await queryRunner.query(
      `ALTER TABLE "chat" ADD "creatorId" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "chat" DROP COLUMN "eventId"`);
    await queryRunner.query(
      `ALTER TABLE "chat" ADD "eventId" character varying`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8ac72aa79bc8cd48a56925d167" ON "venues" ("trendingScore") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_eeb492da6894abf2e0acceb53f" ON "follows" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_24d59913f0aac25743ca9eff76" ON "follows" ("followedUserId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6cd0c52213fcfc2cd90ff9a76c" ON "follows" ("followedVenueId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bab6cf3a1e33e6790e9b9bd7d1" ON "events" ("title") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c621508a2b84ae21d3f971cdb4" ON "events" ("creatorId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0af7bb0535bc01f3c130cfe5fe" ON "events" ("venueId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_614920333d353cbbbd2463d29f" ON "events" ("startTime") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5c3883e1c014de723f2282d178" ON "events" ("visibility") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f94e1b5aa275d15dc26d7c4d3f" ON "events" ("trendingScore") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3911711b8afdd783fe98b7f979" ON "events" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_caad021bd1f4161811a0d30b23" ON "events" ("updatedAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a88b8dfd62817444b3fa6012ad" ON "event_interests" ("event_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_520aec2411140f17d3870d05a8" ON "event_interests" ("interest_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_616348777087f88bb8cb743e60" ON "interests" ("name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bd58ef8d62a848ee1c6b079032" ON "interests" ("sort_order") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cb0511a8fabd1a2ac9912f7a9a" ON "user_interests" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f635c6e4d9fb949a9f62c75053" ON "user_interests" ("interest_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_07eb323a7b08ba51fe4b582f3f" ON "event_attendees" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_21056813ffb169d392d38a40c2" ON "event_attendees" ("eventId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b323f3a704418085cff3d3a734" ON "event_attendees" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bccb64c36c418040a7e8cfc630" ON "event_attendees" ("joinedAt") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_edb4129eb44589ffaccce13f6c" ON "event_attendees" ("eventId", "userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e16675fae83bc603f30ae8fbdd" ON "chat_participants" ("chatId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fb6add83b1a7acc94433d38569" ON "chat_participants" ("userId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "follows" ADD CONSTRAINT "UQ_user_follow" UNIQUE ("userId", "followedUserId", "followedVenueId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_interests" ADD CONSTRAINT "UQ_2cfd18b00edfa2793d438350a8a" UNIQUE ("event_id", "interest_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_interests" ADD CONSTRAINT "UQ_ca14bb81355d38c5f6b489179be" UNIQUE ("user_id", "interest_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_events" ADD CONSTRAINT "FK_348a5c1b15e154a8b742fba6f78" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_hours" ADD CONSTRAINT "FK_9107cc66d2e6c83621b3c301193" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "age_verifications" ADD CONSTRAINT "FK_45f3f68779fe8837c84e04d0d88" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_reviews" ADD CONSTRAINT "FK_d84da26eed68ebf019b525e0612" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_reviews" ADD CONSTRAINT "FK_a50659b13303f6fb5276ecb2ad1" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_photos" ADD CONSTRAINT "FK_bb7918d3a024b822e0e96c2d87a" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_photos" ADD CONSTRAINT "FK_7912cd66c6d3f47dc042b573855" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_relationships" ADD CONSTRAINT "FK_2654d54cd79679ba775b2dca94e" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_relationships" ADD CONSTRAINT "FK_dd6d4562cb6e3e36dfb64b452ee" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ADD CONSTRAINT "FK_8481388d6325e752cd4d7e26c6d" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_preferences" ADD CONSTRAINT "FK_458057fa75b66e68a275647da2e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_views" ADD CONSTRAINT "FK_0d8e6bc15a401ba325c87055009" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_views" ADD CONSTRAINT "FK_616030abf9c6c0f8aae9dae1cb5" FOREIGN KEY ("viewed_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_interests" ADD CONSTRAINT "FK_a88b8dfd62817444b3fa6012ad6" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_interests" ADD CONSTRAINT "FK_520aec2411140f17d3870d05a85" FOREIGN KEY ("interest_id") REFERENCES "interests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_interests" ADD CONSTRAINT "FK_cb0511a8fabd1a2ac9912f7a9aa" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_interests" ADD CONSTRAINT "FK_f635c6e4d9fb949a9f62c75053b" FOREIGN KEY ("interest_id") REFERENCES "interests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_7540635fef1922f0b156b9ef74f" FOREIGN KEY ("chat_id") REFERENCES "chat"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_22133395bd13b970ccd0c34ab22" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_to_venue_type" ADD CONSTRAINT "FK_6957cf6f44eca92cda24bb063de" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_to_venue_type" ADD CONSTRAINT "FK_c7bf5367acdfb1696ce3eace1e7" FOREIGN KEY ("venue_type_id") REFERENCES "venue_types"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_participants" ADD CONSTRAINT "FK_e16675fae83bc603f30ae8fbdd5" FOREIGN KEY ("chatId") REFERENCES "chat"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_participants" ADD CONSTRAINT "FK_fb6add83b1a7acc94433d385692" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat_participants" DROP CONSTRAINT "FK_fb6add83b1a7acc94433d385692"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_participants" DROP CONSTRAINT "FK_e16675fae83bc603f30ae8fbdd5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_to_venue_type" DROP CONSTRAINT "FK_c7bf5367acdfb1696ce3eace1e7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_to_venue_type" DROP CONSTRAINT "FK_6957cf6f44eca92cda24bb063de"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_22133395bd13b970ccd0c34ab22"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_7540635fef1922f0b156b9ef74f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_interests" DROP CONSTRAINT "FK_f635c6e4d9fb949a9f62c75053b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_interests" DROP CONSTRAINT "FK_cb0511a8fabd1a2ac9912f7a9aa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_interests" DROP CONSTRAINT "FK_520aec2411140f17d3870d05a85"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_interests" DROP CONSTRAINT "FK_a88b8dfd62817444b3fa6012ad6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_views" DROP CONSTRAINT "FK_616030abf9c6c0f8aae9dae1cb5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_views" DROP CONSTRAINT "FK_0d8e6bc15a401ba325c87055009"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_preferences" DROP CONSTRAINT "FK_458057fa75b66e68a275647da2e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" DROP CONSTRAINT "FK_8481388d6325e752cd4d7e26c6d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_relationships" DROP CONSTRAINT "FK_dd6d4562cb6e3e36dfb64b452ee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_relationships" DROP CONSTRAINT "FK_2654d54cd79679ba775b2dca94e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_photos" DROP CONSTRAINT "FK_7912cd66c6d3f47dc042b573855"`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_photos" DROP CONSTRAINT "FK_bb7918d3a024b822e0e96c2d87a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_reviews" DROP CONSTRAINT "FK_a50659b13303f6fb5276ecb2ad1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_reviews" DROP CONSTRAINT "FK_d84da26eed68ebf019b525e0612"`,
    );
    await queryRunner.query(
      `ALTER TABLE "age_verifications" DROP CONSTRAINT "FK_45f3f68779fe8837c84e04d0d88"`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_hours" DROP CONSTRAINT "FK_9107cc66d2e6c83621b3c301193"`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_events" DROP CONSTRAINT "FK_348a5c1b15e154a8b742fba6f78"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_interests" DROP CONSTRAINT "UQ_ca14bb81355d38c5f6b489179be"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_interests" DROP CONSTRAINT "UQ_2cfd18b00edfa2793d438350a8a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "follows" DROP CONSTRAINT "UQ_user_follow"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fb6add83b1a7acc94433d38569"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e16675fae83bc603f30ae8fbdd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_edb4129eb44589ffaccce13f6c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bccb64c36c418040a7e8cfc630"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b323f3a704418085cff3d3a734"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_21056813ffb169d392d38a40c2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_07eb323a7b08ba51fe4b582f3f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f635c6e4d9fb949a9f62c75053"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cb0511a8fabd1a2ac9912f7a9a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bd58ef8d62a848ee1c6b079032"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_616348777087f88bb8cb743e60"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_520aec2411140f17d3870d05a8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a88b8dfd62817444b3fa6012ad"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_caad021bd1f4161811a0d30b23"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3911711b8afdd783fe98b7f979"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f94e1b5aa275d15dc26d7c4d3f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5c3883e1c014de723f2282d178"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_614920333d353cbbbd2463d29f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0af7bb0535bc01f3c130cfe5fe"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c621508a2b84ae21d3f971cdb4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bab6cf3a1e33e6790e9b9bd7d1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6cd0c52213fcfc2cd90ff9a76c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_24d59913f0aac25743ca9eff76"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_eeb492da6894abf2e0acceb53f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8ac72aa79bc8cd48a56925d167"`,
    );
    await queryRunner.query(`ALTER TABLE "chat" DROP COLUMN "eventId"`);
    await queryRunner.query(`ALTER TABLE "chat" ADD "eventId" uuid`);
    await queryRunner.query(`ALTER TABLE "chat" DROP COLUMN "creatorId"`);
    await queryRunner.query(`ALTER TABLE "chat" ADD "creatorId" uuid`);
    await queryRunner.query(`ALTER TABLE "chat" DROP COLUMN "type"`);
    await queryRunner.query(
      `ALTER TABLE "chat" ADD "type" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_attendees" DROP COLUMN "joinedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_attendees" ADD "joinedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_attendees" DROP COLUMN "status"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."event_attendees_status_enum" AS ENUM('going', 'maybe', 'invited', 'requested')`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_attendees" ADD "status" "public"."event_attendees_status_enum" NOT NULL DEFAULT 'invited'`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_attendees" DROP COLUMN "userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_attendees" ADD "userId" uuid NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_interests" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "interests" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "interests" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "interests" DROP COLUMN "description"`,
    );
    await queryRunner.query(`ALTER TABLE "interests" ADD "description" text`);
    await queryRunner.query(
      `ALTER TABLE "event_interests" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "updatedAt"`);
    await queryRunner.query(
      `ALTER TABLE "events" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "createdAt"`);
    await queryRunner.query(
      `ALTER TABLE "events" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "visibility"`);
    await queryRunner.query(
      `CREATE TYPE "public"."events_visibility_enum" AS ENUM('public', 'friends', 'private')`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" ADD "visibility" "public"."events_visibility_enum" NOT NULL DEFAULT 'public'`,
    );
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "endTime"`);
    await queryRunner.query(
      `ALTER TABLE "events" ADD "endTime" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "startTime"`);
    await queryRunner.query(
      `ALTER TABLE "events" ADD "startTime" TIMESTAMP WITH TIME ZONE NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "venueId"`);
    await queryRunner.query(`ALTER TABLE "events" ADD "venueId" uuid`);
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "creatorId"`);
    await queryRunner.query(
      `ALTER TABLE "events" ADD "creatorId" uuid NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "follows" DROP COLUMN "followedVenueId"`,
    );
    await queryRunner.query(`ALTER TABLE "follows" ADD "followedVenueId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "follows" DROP COLUMN "followedUserId"`,
    );
    await queryRunner.query(`ALTER TABLE "follows" ADD "followedUserId" uuid`);
    await queryRunner.query(`ALTER TABLE "follows" DROP COLUMN "type"`);
    await queryRunner.query(
      `CREATE TYPE "public"."follows_type_enum" AS ENUM('user', 'venue')`,
    );
    await queryRunner.query(
      `ALTER TABLE "follows" ADD "type" "public"."follows_type_enum" NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "follows" DROP COLUMN "userId"`);
    await queryRunner.query(`ALTER TABLE "follows" ADD "userId" uuid NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "follows" ADD CONSTRAINT "UQ_user_follow" UNIQUE ("userId", "followedUserId", "followedVenueId")`,
    );
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "trendingScore"`);
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "trendingScore" real NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "website"`);
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "website" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "longitude"`);
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "longitude" double precision NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "latitude"`);
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "latitude" double precision NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "description"`);
    await queryRunner.query(`ALTER TABLE "venues" ADD "description" text`);
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "name"`);
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "name" character varying NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "venue_reviews" DROP COLUMN "review"`);
    await queryRunner.query(`ALTER TABLE "venue_reviews" ADD "review" text`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "updated_at"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "created_at"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "roles"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "roles" text array NOT NULL DEFAULT '{user}'`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "status"`);
    await queryRunner.query(
      `CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'inactive', 'suspended')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "status" "public"."users_status_enum" NOT NULL DEFAULT 'active'`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "interests"`);
    await queryRunner.query(`ALTER TABLE "users" ADD "interests" text array`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "bio"`);
    await queryRunner.query(`ALTER TABLE "users" ADD "bio" text`);
    await queryRunner.query(
      `ALTER TABLE "venue_hours" ALTER COLUMN "close_time" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_hours" ALTER COLUMN "open_time" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_events" ALTER COLUMN "end_time" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_events" DROP COLUMN "description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_events" ADD "description" text`,
    );
    await queryRunner.query(`ALTER TABLE "interests" DROP COLUMN "icon_url"`);
    await queryRunner.query(`ALTER TABLE "follows" DROP COLUMN "created_at"`);
    await queryRunner.query(`ALTER TABLE "follows" DROP COLUMN "following_id"`);
    await queryRunner.query(
      `ALTER TABLE "user_profiles" DROP COLUMN "birthDate"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" DROP COLUMN "is_public"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" DROP COLUMN "profile_cover_url"`,
    );
    await queryRunner.query(`ALTER TABLE "user_profiles" DROP COLUMN "gender"`);
    await queryRunner.query(`DROP TYPE "public"."user_profiles_gender_enum"`);
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "createdAt"`);
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "lastRefreshed"`);
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "metadata"`);
    await queryRunner.query(
      `ALTER TABLE "venues" DROP COLUMN "googleRatingsTotal"`,
    );
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "googleRating"`);
    await queryRunner.query(
      `ALTER TABLE "venues" DROP COLUMN "lastModifiedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "venues" DROP COLUMN "last_modified_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "venues" DROP COLUMN "adminOverrides"`,
    );
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "isOpenNow"`);
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "phone"`);
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "status"`);
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "isFeatured"`);
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "priceLevel"`);
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "popularity"`);
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "reviewCount"`);
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "rating"`);
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "googlePlaceId"`);
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "address"`);
    await queryRunner.query(
      `ALTER TABLE "venue_hours" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_hours" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_hours" DROP COLUMN "dayOfWeek"`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_events" DROP COLUMN "attendee_count"`,
    );
    await queryRunner.query(`ALTER TABLE "venue_events" DROP COLUMN "status"`);
    await queryRunner.query(`ALTER TABLE "venue_events" DROP COLUMN "price"`);
    await queryRunner.query(
      `ALTER TABLE "venue_events" DROP COLUMN "is_featured"`,
    );
    await queryRunner.query(`ALTER TABLE "venue_events" DROP COLUMN "url"`);
    await queryRunner.query(
      `ALTER TABLE "follows" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "trending_score" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "review_count" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "average_rating" double precision NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(`ALTER TABLE "venues" ADD "dress_code" text`);
    await queryRunner.query(`ALTER TABLE "venues" ADD "music_policy" text`);
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "entry_requirements" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "profile_image_url" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "cover_image_url" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "venues" ADD "owner_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "venues" ADD "tags" text array`);
    await queryRunner.query(`ALTER TABLE "venues" ADD "capacity" integer`);
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "category" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "phone_number" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "country" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "postal_code" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "state" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "city" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "address_line_2" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "address_line_1" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_hours" ADD "day_of_week" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_events" ADD "recurrence_pattern" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_events" ADD "is_recurring" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`ALTER TABLE "venue_events" ADD "tags" text array`);
    await queryRunner.query(
      `ALTER TABLE "venue_events" ADD "ticket_url" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_events" ADD "ticket_price" numeric(10,2)`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c7bf5367acdfb1696ce3eace1e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6957cf6f44eca92cda24bb063d"`,
    );
    await queryRunner.query(`DROP TABLE "venue_to_venue_type"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_366ea02dc46f24c57d225cbd79"`,
    );
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3d04da35452c848f4d0858f393"`,
    );
    await queryRunner.query(`DROP TABLE "profile_views"`);
    await queryRunner.query(`DROP TABLE "user_preferences"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_76339b03d3956dc40d478c8062"`,
    );
    await queryRunner.query(`DROP TABLE "user_relationships"`);
    await queryRunner.query(`DROP TABLE "venue_photos"`);
    await queryRunner.query(`DROP TYPE "public"."venue_photos_source_enum"`);
    await queryRunner.query(`DROP TABLE "age_verifications"`);
    await queryRunner.query(`DROP TABLE "venue_types"`);
    await queryRunner.query(
      `ALTER TABLE "event_attendees" ADD CONSTRAINT "UQ_event_attendees_eventId_userId" UNIQUE ("userId", "eventId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_interests" ADD CONSTRAINT "UQ_user_interests_user_id_interest_id" UNIQUE ("user_id", "interest_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_interests" ADD CONSTRAINT "UQ_event_interests_event_id_interest_id" UNIQUE ("event_id", "interest_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_chat_participants_userId" ON "chat_participants" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_chat_lastActivityAt" ON "chat" ("lastActivityAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_chat_eventId" ON "chat" ("eventId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_chat_creatorId" ON "chat" ("creatorId") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_chat_type" ON "chat" ("type") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_event_attendees_joinedAt" ON "event_attendees" ("joinedAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_event_attendees_status" ON "event_attendees" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_event_attendees_eventId" ON "event_attendees" ("eventId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_event_attendees_userId" ON "event_attendees" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_interests_interest_id" ON "user_interests" ("interest_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_interests_user_id" ON "user_interests" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_interests_sort_order" ON "interests" ("sort_order") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_interests_name" ON "interests" ("name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_event_interests_interest_id" ON "event_interests" ("interest_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_event_interests_event_id" ON "event_interests" ("event_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_events_createdAt" ON "events" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_events_trendingScore" ON "events" ("trendingScore") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_events_visibility" ON "events" ("visibility") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_events_startTime" ON "events" ("startTime") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_events_venueId" ON "events" ("venueId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_events_creatorId" ON "events" ("creatorId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_events_title" ON "events" ("title") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_follow_followedVenueId" ON "follows" ("followedVenueId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_follow_followedUserId" ON "follows" ("followedUserId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_follow_type" ON "follows" ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_follow_userId" ON "follows" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_venue_is_active" ON "venues" ("is_active") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_venue_trending_score" ON "venues" ("trending_score") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_venue_owner_id" ON "venues" ("owner_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_venue_location" ON "venues" ("latitude", "longitude") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_venue_reviews_rating" ON "venue_reviews" ("rating") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_venue_reviews_user_id" ON "venue_reviews" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_venue_reviews_venue_id" ON "venue_reviews" ("venue_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_venue_hours_venue_id" ON "venue_hours" ("venue_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_venue_events_venue_id" ON "venue_events" ("venue_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_venue_events_start_time" ON "venue_events" ("start_time") `,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_participants" ADD CONSTRAINT "FK_fb6add83b1a7acc94433d385692" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_participants" ADD CONSTRAINT "FK_e16675fae83bc603f30ae8fbdd5" FOREIGN KEY ("chatId") REFERENCES "chat"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_attendees" ADD CONSTRAINT "FK_07eb323a7b08ba51fe4b582f3f4" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_interests" ADD CONSTRAINT "FK_user_interests_interest_id" FOREIGN KEY ("interest_id") REFERENCES "interests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_interests" ADD CONSTRAINT "FK_user_interests_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_interests" ADD CONSTRAINT "FK_event_interests_interest_id" FOREIGN KEY ("interest_id") REFERENCES "interests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_interests" ADD CONSTRAINT "FK_event_interests_event_id" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" ADD CONSTRAINT "FK_0af7bb0535bc01f3c130cfe5fe7" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" ADD CONSTRAINT "FK_c621508a2b84ae21d3f971cdb47" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ADD CONSTRAINT "FK_8481388d6325e752cd4d7e26c6d" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "venues" ADD CONSTRAINT "FK_8cb5cf3df16fc75663f85b5b35c" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_reviews" ADD CONSTRAINT "FK_a50659b13303f6fb5276ecb2ad1" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_reviews" ADD CONSTRAINT "FK_d84da26eed68ebf019b525e0612" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_hours" ADD CONSTRAINT "FK_9107cc66d2e6c83621b3c301193" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue_events" ADD CONSTRAINT "FK_348a5c1b15e154a8b742fba6f78" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }
}
