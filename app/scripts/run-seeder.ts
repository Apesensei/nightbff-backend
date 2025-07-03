import { NestFactory } from '@nestjs/core';
import { SeederModule } from '../src/database/seeds/seeder.module';
import { SeederService } from '../src/database/seeds/seeder.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Seeder');
  logger.log('🚀 Starting standalone seeder process...');

  const appContext = await NestFactory.createApplicationContext(SeederModule);
  
  const seeder = appContext.get(SeederService);
  
  try {
    logger.log('Executing seeder service...');
    await seeder.seed();
    logger.log('Seeder service executed successfully.');
  } catch (error) {
    logger.error('Seeding failed!', error.stack);
    throw error;
  } finally {
    logger.log('Closing application context...');
    await appContext.close();
    logger.log('Application context closed. Exiting.');
  }
}

bootstrap()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    process.exit(1);
  }); 