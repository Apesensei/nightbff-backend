import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule, TypeOrmModuleOptions } from "@nestjs/typeorm";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { dataSourceOptions } from "./data-source";

// Import Common Modules
import { DatabaseModule } from "./common/database/database.module";

// Import Feature Modules
import { AuthModule } from "./microservices/auth/auth.module";
import { UserModule } from "./microservices/user/user.module";
import { VenueModule } from "./microservices/venue/venue.module";
import { EventsModule as EventModule } from "./microservices/event/events.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        process.env.NODE_ENV === "production"
          ? ".env.production"
          : ".env.development",
      ],
    }),
    DatabaseModule,
    TypeOrmModule.forRoot({
      ...(dataSourceOptions as TypeOrmModuleOptions),
      autoLoadEntities: false,
      synchronize: false,
    }),
    EventEmitterModule.forRoot(),
    AuthModule,
    UserModule,
    VenueModule,
    EventModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
