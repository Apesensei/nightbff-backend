import { Module } from "@nestjs/common";
// Remove TypeOrmModule import if no longer needed directly
// import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";

// Entities - Keep imports if entities are used elsewhere in the module
// import { Chat } from "./entities/chat.entity";
// import { Message } from "./entities/message.entity";

// Controllers
import { ChatController } from "./controllers/chat.controller";
import { MessageController } from "./controllers/message.controller";
import { ChatParticipantsController } from "./controllers/chat-participants.controller";
import { MediaUploadController } from "./controllers/media-upload.controller";

// Services
import { ChatService } from "./services/chat.service";
import { MessageService } from "./services/message.service";
import { MediaUploadService } from "./services/media-upload.service";
import { EventChatIntegrationService } from "./services/event-chat-integration.service";

// Gateway
import { ChatGateway } from "./gateways/chat.gateway";
import { ParseSocketJwtPipe } from "./pipes/parse-socket-jwt.pipe";

// Module imports
import { EventModule } from "../event/event.module"; // Keep this if ChatModule interacts with EventModule services/providers
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../../common/database/database.module"; // Add this import

@Module({
  imports: [
    // Remove: TypeOrmModule.forFeature([Chat, Message]),
    DatabaseModule, // Add this import
    EventEmitterModule.forRoot({
      // set this to `true` to use wildcards
      wildcard: false,
      // the delimiter used to segment namespaces
      delimiter: ".",
      // set this to `true` if you want to emit the newListener event
      newListener: false,
      // set this to `true` if you want to emit the removeListener event
      removeListener: false,
      // the maximum amount of listeners that can be assigned to an event
      maxListeners: 10,
      // show event name in memory leak message when more than maximum amount of listeners is assigned
      verboseMemoryLeak: false,
      // disable throwing uncaughtException if an error event is emitted and it has no listeners
      ignoreErrors: false,
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: configService.get<string>("JWT_EXPIRATION", "7d"),
        },
      }),
    }),
    EventModule,
    AuthModule, // Ensure AuthModule is imported (already present)
    ConfigModule,
  ],
  controllers: [
    ChatController,
    MessageController,
    ChatParticipantsController,
    MediaUploadController,
  ],
  providers: [
    ChatService,
    MessageService,
    ChatGateway,
    ParseSocketJwtPipe,
    MediaUploadService,
    EventChatIntegrationService,
  ],
  exports: [ChatService, MessageService, MediaUploadService],
})
export class ChatModule {}
