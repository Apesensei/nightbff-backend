import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { ConfigService } from "@nestjs/config";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Response } from "express";
import compression = require("compression");

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);

  app.setGlobalPrefix("api");

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
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📁 Static files served from: /uploads/`);
  console.log(`⚡ Compression and caching enabled for optimal performance`);
}

bootstrap();
