import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule, TypeOrmModuleOptions } from "@nestjs/typeorm";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { AppDataSource } from "./database/config/data-source";

// Import Common Modules
import { DatabaseModule } from "./common/database/database.module";
import { FeatureFlagsModule } from "./common/feature-flags/feature-flags.module";

// Import Feature Modules
import { AuthModule } from "./microservices/auth/auth.module";
import { UserModule } from "./microservices/user/user.module";
import { VenueModule } from "./microservices/venue/venue.module";
import { EventsModule as EventModule } from "./microservices/event/events.module";
import { PlanModule } from "./microservices/plan/plan.module";
import { ChatModule } from "./microservices/chat/chat.module";
import { InterestModule } from "./microservices/interest/interest.module";

// Get the service name from environment variable
const serviceName = process.env.SERVICE_NAME;

// Define service-specific module mappings with proper typing
const serviceModules: Record<string, any[]> = {
  auth: [AuthModule],
  user: [UserModule, AuthModule], // UserModule may depend on AuthModule
  venue: [VenueModule, UserModule, EventModule, InterestModule, AuthModule], // VenueModule has many dependencies
  event: [EventModule, AuthModule, UserModule], // EventModule may depend on Auth and User
  plan: [PlanModule, AuthModule, UserModule, VenueModule], // PlanModule may depend on multiple modules
  chat: [ChatModule, AuthModule, UserModule], // ChatModule likely depends on Auth and User
  interest: [InterestModule, AuthModule, UserModule], // InterestModule may depend on Auth and User
  notification: [AuthModule, UserModule], // Notification likely needs Auth and User (assuming no dedicated NotificationModule)
};

// Determine which modules to load
let featureModulesToLoad: any[];

if (serviceName && serviceName in serviceModules) {
  // Load service-specific modules
  featureModulesToLoad = serviceModules[serviceName];
  console.log(`🎯 Loading service-specific modules for: ${serviceName}`);
  console.log(
    `📦 Modules: ${serviceModules[serviceName].map((m: any) => m.name).join(", ")}`,
  );
} else {
  // Fallback: Load all modules (backward compatibility)
  featureModulesToLoad = [
    AuthModule,
    UserModule,
    VenueModule,
    EventModule,
    PlanModule,
    ChatModule,
    InterestModule,
  ];
  console.log(
    `🔄 SERVICE_NAME not specified or unknown, loading all modules for backward compatibility`,
  );
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        process.env.NODE_ENV === "production"
          ? ".env.production"
          : process.env.NODE_ENV === "performance"
            ? ".env.performance"
            : ".env.development",
      ],
    }),
    DatabaseModule,
    FeatureFlagsModule,
    TypeOrmModule.forRoot({
      ...(AppDataSource.options as TypeOrmModuleOptions),
      autoLoadEntities: false,
      synchronize: false,
      migrationsRun: false,
    }),
    EventEmitterModule.forRoot(),
    ...featureModulesToLoad,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
