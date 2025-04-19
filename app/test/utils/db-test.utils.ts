import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { User } from "../../src/microservices/auth/entities/user.entity";
import { AgeVerification } from "../../src/microservices/auth/entities/age-verification.entity";
import { UserProfile } from "../../src/microservices/user/entities/user-profile.entity";
import { UserRelationship } from "../../src/microservices/user/entities/user-relationship.entity";
import { ProfileView } from "../../src/microservices/user/entities/profile-view.entity";
import { Chat } from "../../src/microservices/chat/entities/chat.entity";
import { Message } from "../../src/microservices/chat/entities/message.entity";
import { Event } from "../../src/microservices/event/entities/event.entity";
import { EventAttendee } from "../../src/microservices/event/entities/event-attendee.entity";
import { Interest } from "../../src/microservices/interest/entities/interest.entity";
import { UserInterest } from "../../src/microservices/interest/entities/user-interest.entity";
import { EventInterest } from "../../src/microservices/interest/entities/event-interest.entity";
// Add any other entities used across tests needing DB connection
// import { Venue } from "../../src/microservices/venue/entities/venue.entity";
// import { VenueProfile } from "../../src/microservices/venue/entities/venue-profile.entity";

let container: StartedPostgreSqlContainer | null = null;

/**
 * Starts a PostgreSQL Testcontainer and returns connection options.
 * Ensures only one container is running per test process.
 */
export async function setupTestDatabase(): Promise<{
  container: StartedPostgreSqlContainer;
  typeOrmOptions: TypeOrmModuleOptions;
}> {
  if (container) {
    // Reuse existing container if already started in this process
    // This might happen if multiple describe blocks run in the same file/process
    // For full isolation *between test files*, jest --runInBand might be needed or separate container management
    console.warn("Reusing existing Test DB Container for this test run.");
    // Note: Schema might not be clean if reusing without dropSchema/synchronize in subsequent modules
    // Consider forcing recreation or managing schema explicitly if reuse is problematic.
  } else {
    console.log("Starting Test DB Container...");
    container = await new PostgreSqlContainer("postgres:15").start();
    console.log("Test DB Container Started.");
  }

  const options: TypeOrmModuleOptions = {
    type: "postgres",
    host: container.getHost(),
    port: container.getPort(),
    username: container.getUsername(),
    password: container.getPassword(),
    database: container.getDatabase(),
    entities: [
      // List all entities needed across integration/repository tests
      User,
      AgeVerification,
      UserProfile,
      UserRelationship,
      ProfileView,
      Chat,
      Message,
      Event,
      EventAttendee,
      Interest,
      UserInterest,
      EventInterest,
      // Venue, VenueProfile // Add if needed
    ],
    synchronize: true, // Use synchronize for simplicity in test containers
    dropSchema: true, // Ensure clean state on module init (may impact container reuse strategy)
    logging: false, // Enable ['query', 'error'] for debugging
  };
  return { container, typeOrmOptions: options };
}

/**
 * Stops the PostgreSQL Testcontainer if it's running.
 * Safe to call multiple times.
 */
export async function teardownTestDatabase() {
  if (container) {
    console.log("Stopping Test DB Container...");
    try {
      await container.stop();
      console.log("Test DB Container Stopped.");
    } catch (error) {
      console.error("Error stopping Test DB Container:", error);
    } finally {
      container = null; // Ensure container reference is cleared
    }
  }
}

// Optional: Hook into Jest's process exit to ensure cleanup
// process.on('exit', async () => {
//   await teardownTestDatabase();
// });
// Note: Using process.on('exit') can be unreliable. Jest's globalSetup/globalTeardown is better.
// For simplicity, relying on afterAll in test suites is the current approach.
