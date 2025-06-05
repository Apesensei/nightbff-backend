import "reflect-metadata";
import { DataSource, DataSourceOptions } from "typeorm";
import { faker } from "@faker-js/faker";
import * as bcrypt from "bcrypt";
import * as dotenv from "dotenv";
import * as path from "path";
import { User, UserRole, UserStatus } from "../src/microservices/auth/entities/user.entity"; // Adjust path as necessary
import { UserProfile, Gender } from "../src/microservices/user/entities/user-profile.entity"; // Adjust path as necessary
import { AgeVerification } from "../src/microservices/auth/entities/age-verification.entity"; // <<< ADD THIS IMPORT

// --- Configuration ---
const NUM_USERS_TO_SEED = 175; // Target number of users (adjust as needed)
const MIN_AGE = 18;
const MAX_AGE = 45;
const PASSWORD_PLACEHOLDER = "password123"; // Placeholder password
const SALT_ROUNDS = 10; // For bcrypt hashing

// Load .env.development
const envPath = path.resolve(process.cwd(), ".env.development");
const envLoadResult = dotenv.config({ path: envPath });

if (envLoadResult.error) {
  console.error(`FATAL: Could not load .env.development file from ${envPath}`);
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("FATAL: DATABASE_URL not found in environment variables.");
  process.exit(1);
}

// TypeORM DataSource Configuration (mimicking data-source.ts for dev)
const dataSourceOptions: DataSourceOptions = {
  type: "postgres",
  url: DATABASE_URL,
  synchronize: false, // Use migrations in dev
  logging: ["error", "warn"], // Log only errors and warnings during seeding
  entities: [User, UserProfile, AgeVerification], // <<< ADD AgeVerification HERE
  // migrations: [], // Not needed for seeding script
  // migrationsTableName: "typeorm_migrations", // Not needed for seeding script
};

const AppDataSource = new DataSource(dataSourceOptions);

// --- Helper Functions ---

// Function to generate random coordinates within a given bounding box
// Example: Bay Area, California
function getRandomLocation(bounds = {
  minLat: 37.3,
  maxLat: 38.0,
  minLng: -122.5,
  maxLng: -121.8,
}) {
  return {
    latitude: faker.location.latitude({ min: bounds.minLat, max: bounds.maxLat }),
    longitude: faker.location.longitude({ min: bounds.minLng, max: bounds.maxLng }),
  };
}

function getRandomGender(): Gender {
  const rand = Math.random();
  if (rand < 0.45) return Gender.MALE; // 45%
  if (rand < 0.9) return Gender.FEMALE; // 45%
  return Gender.OTHER; // 10% (Changed from PREFER_NOT_TO_SAY)
  // Note: Gender.OTHER is now the fallback/remainder category
}

async function seedDatabase() {
  try {
    console.log("Initializing database connection...");
    await AppDataSource.initialize();
    console.log("Database connection initialized.");

    const userRepository = AppDataSource.getRepository(User);
    const userProfileRepository = AppDataSource.getRepository(UserProfile);

    console.log(`Checking existing users...`);
    const existingUserCount = await userRepository.count();
    console.log(`Found ${existingUserCount} existing users.`);

    const usersToCreate = NUM_USERS_TO_SEED - existingUserCount;

    if (usersToCreate <= 0) {
      console.log(
        `Database already has ${existingUserCount} users. No new users will be seeded.`,
      );
      return;
    }

    console.log(`Seeding ${usersToCreate} new users...`);

    // Generate placeholder hash once
    const placeholderHash = await bcrypt.hash(PASSWORD_PLACEHOLDER, SALT_ROUNDS);

    for (let i = 0; i < usersToCreate; i++) {
      const loopIndex = existingUserCount + i; // Ensure unique emails/usernames

      // 1. Create User
      const user = new User();
      user.email = faker.internet.email({
        firstName: `loadtest${loopIndex}`,
        provider: "nightbff.dev",
      });
      user.username = faker.internet.userName({
        firstName: `LoadTest${loopIndex}`,
      });
      user.displayName = faker.person.fullName();
      user.passwordHash = placeholderHash;
      user.photoURL = `https://via.placeholder.com/150/000000/FFFFFF/?text=User${loopIndex}`; // Simple placeholder
      user.roles = [UserRole.USER];
      user.status = UserStatus.ACTIVE;
      user.isVerified = true; // Assume verified for testing
      user.isAgeVerified = true; // Assume age verified

      // Add random location
      const location = getRandomLocation();
      user.locationLatitude = location.latitude;
      user.locationLongitude = location.longitude;

      try {
        const savedUser = await userRepository.save(user);

        // 2. Create UserProfile
        const userProfile = new UserProfile();
        userProfile.userId = savedUser.id; // Link to the saved User's ID
        userProfile.gender = getRandomGender();
        userProfile.birthDate = faker.date.birthdate({
          min: MIN_AGE,
          max: MAX_AGE,
          mode: "age",
        });
        userProfile.lastActiveAt = faker.date.recent({ days: 30 });
        userProfile.isPublic = true;

        await userProfileRepository.save(userProfile);

        if ((i + 1) % 50 === 0) {
          // Log progress every 50 users
          console.log(`Seeded ${i + 1} of ${usersToCreate} users...`);
        }
      } catch (error) {
        console.error(`Error seeding user ${loopIndex}:`, error);
        // Decide whether to continue or stop on error
        // For simplicity, we continue here, but you might want to stop
      }
    }

    console.log(`Successfully seeded ${usersToCreate} new users.`);
  } catch (error) {
    console.error("Error during database seeding:", error);
    process.exitCode = 1; // Indicate failure
  } finally {
    if (AppDataSource.isInitialized) {
      console.log("Closing database connection...");
      await AppDataSource.destroy();
      console.log("Database connection closed.");
    }
  }
}

// --- Run the Seeding ---
seedDatabase(); 