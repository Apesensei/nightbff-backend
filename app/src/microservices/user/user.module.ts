import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserController, UserLocationController } from "./user.controller";
import { UserService } from "./user.service";
import { UserRepository } from "./repositories/user.repository";
import { User } from '../auth/entities/user.entity';
import { UserPreference } from "./entities/user-preference.entity";
import { ProfileRepository } from "./repositories/profile.repository";
import { UserPreferenceRepository } from "./repositories/user-preference.repository";
import { ProfileService } from "./services/profile.service";
import { PreferenceService } from "./services/preference.service";
import { UserRelationship } from "./entities/user-relationship.entity";
import { ProfileView } from "./entities/profile-view.entity";
import { UserRelationshipRepository } from "./repositories/user-relationship.repository";
import { ProfileViewRepository } from "./repositories/profile-view.repository";
import { UserDiscoveryService } from "./services/user-discovery.service";
import { UserDiscoveryController } from "./controllers/user-discovery.controller";
import { UserImageService } from "./services/user-image.service";
import { UserImageController } from "./controllers/user-image.controller";
import { UserRelationshipService } from "./services/user-relationship.service";
import { UserRelationshipController } from "./controllers/user-relationship.controller";
import { AuthModule } from "../auth/auth.module";
import { MulterModule } from "@nestjs/platform-express";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { Follow } from "./entities/follow.entity";
import { FollowRepository } from "./repositories/follow.repository";
import { UserProfile } from "./entities/user-profile.entity";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { VenueModule } from "../venue/venue.module";
import { AdminController } from './admin.controller';
import { DbStatsModule } from "../../common/database/db-stats.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserProfile,
      UserPreference,
      UserRelationship,
      ProfileView,
      Follow,
      User,
    ]),
    MulterModule.register({
      dest: "./uploads/user",
    }),
    EventEmitterModule.forRoot(),
    AuthModule,
    forwardRef(() => VenueModule),
    ConfigModule,
    DbStatsModule,
    ClientsModule.registerAsync([
      {
        name: "PLAN_SERVICE_RPC",
        imports: [ConfigModule],
        useFactory: () => ({
          transport: Transport.REDIS,
          options: {
            /* Redis options from ConfigService */
          },
        }),
        inject: [ConfigService],
      },
      {
        name: "VENUE_SERVICE_RPC",
        imports: [ConfigModule],
        useFactory: () => ({
          transport: Transport.REDIS,
          options: {
            /* Redis options from ConfigService */
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [
    UserRelationshipController,
    UserController,
    UserLocationController,
    UserDiscoveryController,
    UserImageController,
    AdminController,
  ],
  providers: [
    UserService,
    UserRepository,
    ProfileService,
    ProfileRepository,
    PreferenceService,
    UserPreferenceRepository,
    UserRelationshipRepository,
    ProfileViewRepository,
    UserDiscoveryService,
    UserImageService,
    UserRelationshipService,
    FollowRepository,
  ],
  exports: [
    UserService,
    UserRepository,
    ProfileViewRepository,
    UserRelationshipRepository,
    UserRelationshipService,
    FollowRepository,
  ],
})
export class UserModule {}
