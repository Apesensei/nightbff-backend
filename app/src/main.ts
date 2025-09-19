import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { ConfigService } from "@nestjs/config";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Response, Request } from "express";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import compression from "compression";
import helmet from "helmet";
import * as fs from "fs";
import * as https from "https";
import {
  createGeneralRateLimit,
  createAuthRateLimit,
  createUploadRateLimit,
} from "./common/middleware/rate-limiting.config";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);

  // Validate JWT_SECRET at application startup
  const jwtSecret = configService.get<string>("JWT_SECRET");
  if (!jwtSecret || jwtSecret.length < 32) {
    console.error(
      "❌ JWT_SECRET validation failed: Must be set and at least 32 characters",
    );
    process.exit(1);
  }

  // Configure security headers with helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // Configure rate limiting
  const generalLimiter = createGeneralRateLimit(configService);
  const authLimiter = createAuthRateLimit(configService);
  const uploadLimiter = createUploadRateLimit(configService);

  // Apply general rate limiting to all API routes
  app.use("/api", generalLimiter);

  // Apply auth-specific rate limiting
  app.use("/api/auth", authLimiter);

  // Apply upload rate limiting (if upload endpoints exist)
  app.use("/api/upload", uploadLimiter);

  // Get Express instance for custom routes
  const expressApp = app.getHttpAdapter().getInstance();

  // Add root health endpoint before global prefix
  expressApp.get("/health", (req: Request, res: Response) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "nightbff-backend",
    });
  });

  app.setGlobalPrefix("api");

  // Add API root endpoint after global prefix
  expressApp.get("/api", (req: Request, res: Response) => {
    res.json({
      message: "NightBFF API",
      version: "1.0.0",
      status: "operational",
      timestamp: new Date().toISOString(),
    });
  });

  // 🔥 SWAGGER DOCUMENTATION SETUP - COMPREHENSIVE API DOCS
  const config = new DocumentBuilder()
    .setTitle("NightBFF API")
    .setDescription(
      `
# 🌃 NightBFF Backend API Documentation

**Welcome to the NightBFF API!** This is your comprehensive guide to integrating with the NightBFF backend services.

## 🚀 Quick Start for Frontend Integration

### Base URL
- **Development:** \`http://localhost:3000/api\`
- **Production:** \`https://api.nightbff.com/api\`

### Authentication
All protected endpoints require a Bearer token in the Authorization header:
\`\`\`
Authorization: Bearer YOUR_JWT_TOKEN
\`\`\`

### Key Features
- **🔐 Authentication & User Management** - Complete auth flow with JWT
- **💬 Real-time Chat** - WebSocket support for live messaging  
- **🎉 Events & Plans** - Create and manage social events
- **📍 Venue Discovery** - Location-based venue recommendations
- **🎯 Interest Matching** - User preference and recommendation system
- **📱 File Uploads** - Image handling for profiles, events, venues

### WebSocket Connection
For real-time chat, connect to:
\`ws://localhost:3000\` (development) or \`wss://api.nightbff.com\` (production)

### Error Handling
All endpoints return consistent error responses:
\`\`\`json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
\`\`\`

## 📚 Service Architecture
This API follows a microservices architecture with the following modules:
- **Auth Service** - Authentication & authorization
- **User Service** - User profiles & preferences  
- **Chat Service** - Real-time messaging
- **Event Service** - Event management & discovery
- **Venue Service** - Venue data & recommendations
- **Plan Service** - Trip planning & city management
- **Interest Service** - User interests & matching algorithms

Happy coding! 🎯
    `,
    )
    .setVersion("1.0.0")
    .setContact("NightBFF Team", "https://nightbff.com", "api@nightbff.com")
    .setLicense("MIT", "https://opensource.org/licenses/MIT")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "JWT",
        description: "Enter JWT token",
        in: "header",
      },
      "JWT-auth",
    )
    .addServer("http://localhost:3000", "Local Development")
    .addServer("https://api.nightbff.com", "Production")
    .addTag("Authentication", "User authentication and authorization")
    .addTag("Users", "User profile management and discovery")
    .addTag("Chat", "Real-time messaging and media sharing")
    .addTag("Events", "Event creation, management and discovery")
    .addTag("Venues", "Venue data, discovery and recommendations")
    .addTag("Plans", "Trip planning and city management")
    .addTag("Cities", "City data and trending destinations")
    .addTag("Interests", "User interests and preference matching")
    .addTag("File Upload", "Image and media upload endpoints")
    .addTag("Performance Monitoring", "System performance and health checks")
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    deepScanRoutes: true,
  });

  // Customize Swagger UI
  SwaggerModule.setup("api/docs", app, document, {
    customSiteTitle: "NightBFF API Documentation",
    customfavIcon: "/uploads/favicon.ico",
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info h1 { color: #6366f1; }
      .swagger-ui .scheme-container { background: #f8fafc; padding: 20px; border-radius: 8px; }
      .swagger-ui .info .description { font-size: 14px; line-height: 1.6; }
      .swagger-ui .btn.authorize { background-color: #6366f1; border-color: #6366f1; }
      .swagger-ui .btn.authorize:hover { background-color: #4f46e5; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      tryItOutEnabled: true,
    },
  });

  // Enable compression for all responses
  app.use(compression());

  // Configure static file serving with optimization
  const staticFileOptions = {
    maxAge: configService.get<number>("STATIC_FILE_CACHE_TTL", 86400) * 1000, // Convert to milliseconds
    etag: configService.get<boolean>("STATIC_FILE_ETAG_ENABLED", true),
    lastModified: true,
    cacheControl: true,
    setHeaders: (res: Response, filePath: string) => {
      // Set cache control headers for different file types
      if (
        filePath.endsWith(".jpg") ||
        filePath.endsWith(".jpeg") ||
        filePath.endsWith(".png") ||
        filePath.endsWith(".webp")
      ) {
        // Images cache for 7 days
        res.setHeader("Cache-Control", "public, max-age=604800, immutable");
      } else {
        // Other files cache for 1 day
        res.setHeader("Cache-Control", "public, max-age=86400");
      }

      // Add performance headers
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
    },
  };

  // Serve static files from uploads directory
  app.useStaticAssets("uploads", {
    prefix: "/uploads/",
    ...staticFileOptions,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.REDIS,
      options: {
        host: configService.get<string>("REDIS_HOST"),
        port: configService.get<number>("REDIS_PORT"),
        password: configService.get<string>("REDIS_PASSWORD"),
      },
    },
    { inheritAppConfig: true },
  );

  await app.startAllMicroservices();

  const port = configService.get<number>("PORT") || 3000;

  // Configure HTTPS for development
  const httpsKeyPath =
    configService.get<string>("HTTPS_KEY_PATH") || "./certs/localhost-key.pem";
  const httpsCertPath =
    configService.get<string>("HTTPS_CERT_PATH") || "./certs/localhost.pem";

  const httpsOptions = {
    key: fs.readFileSync(httpsKeyPath),
    cert: fs.readFileSync(httpsCertPath),
  };

  // Start HTTPS server
  const server = https.createServer(
    httpsOptions,
    app.getHttpAdapter().getInstance(),
  );
  server.listen(port, () => {
    console.log(`🚀 Application is running on: https://localhost:${port}`);
    console.log(
      `📚 API Documentation available at: https://localhost:${port}/api/docs`,
    );
    console.log(`📁 Static files served from: /uploads/`);
    console.log(`⚡ Compression and caching enabled for optimal performance`);
    console.log(`🔒 HTTPS enabled with self-signed certificate`);
  });
}

bootstrap();
