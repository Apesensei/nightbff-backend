import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeederService } from './seeder.service';
import { User } from '../../microservices/auth/entities/user.entity';
import { ConfigModule } from '@nestjs/config';
import { createDataSource } from '../../database/config/data-source';
import { AgeVerification } from '../../microservices/auth/entities/age-verification.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'test'
          ? 'config/env/test.env'
          : 'config/env/performance.env',
    }),
    // Create data source dynamically to respect NODE_ENV set at runtime
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const dataSourceOptions = createDataSource(process.env.NODE_ENV).options;
        return {
          ...dataSourceOptions,
          entities: [User, AgeVerification],
        };
      },
    }),
    TypeOrmModule.forFeature([User, AgeVerification]),
  ],
  providers: [SeederService],
  exports: [SeederService],
})
export class SeederModule {} 