import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";

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
import { EventsModule } from "../event/events.module";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../../common/database/database.module";

@Module({
  imports: [
    DatabaseModule,
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
    EventsModule,
    AuthModule,
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
