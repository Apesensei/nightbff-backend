import { TypeOrmModule } from '@nestjs/typeorm';
import { User, Chat, Message, Event, EventAttendee, Interest, UserInterest, EventInterest } from '../entities';

export const TypeOrmTestingModule = TypeOrmModule.forRoot({
  type: "sqlite",
  database: ":memory:",
  // Explicitly list entities needed for THIS test connection
  entities: [User, Chat, Message, Event, EventAttendee, Interest, UserInterest, EventInterest],
  synchronize: true, // Keep synchronize for test DB setup
  logging: false, // Set to true for detailed SQL debugging if needed
}); 