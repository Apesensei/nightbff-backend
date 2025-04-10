import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { UserRepository } from "./repositories/user.repository";
import { User } from "../auth/entities/user.entity";
import { Profile } from "./entities/profile.entity";
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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Profile,
      UserPreference,
      UserRelationship,
      ProfileView,
      Follow,
    ]),
    MulterModule.register({
      dest: "./uploads/user",
    }),
    EventEmitterModule.forRoot(),
    AuthModule,
  ],
  controllers: [
    UserController,
    UserDiscoveryController,
    UserImageController,
    UserRelationshipController,
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
