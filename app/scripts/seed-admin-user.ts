import "reflect-metadata";
import { DataSource, DataSourceOptions } from "typeorm";
import * as bcrypt from "bcrypt";
import * as dotenv from "dotenv";
import * as path from "path";
import { User, UserRole, UserStatus } from "../src/microservices/auth/entities/user.entity";
import { UserProfile, Gender } from "../src/microservices/user/entities/user-profile.entity";
import { AgeVerification } from "../src/microservices/auth/entities/age-verification.entity";

// --- Configuration ---
const ADMIN_USER = {
  email: 'admin-loadtest@nightbff.dev',
  username: 'admin_loadtest',
  displayName: 'Admin Load Test User',
  password: 'AdminPassword123!'
};

const SALT_ROUNDS = 10;

// Load .env.performance for performance testing
const envPath = path.resolve(process.cwd(), "../performance-testing/config/.env.performance");
const envLoadResult = dotenv.config({ path: envPath });

if (envLoadResult.error) {
  console.error(`FATAL: Could not load .env.performance file from ${envPath}`);
  process.exit(1);
}

// Build DATABASE_URL from performance environment variables
const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = process.env.DB_PORT || "5434";
const DB_USERNAME = process.env.DB_USERNAME || "admin";
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_DATABASE = process.env.DB_DATABASE || "defaultdb";

if (!DB_PASSWORD) {
  console.error("FATAL: DB_PASSWORD not found in environment variables.");
  process.exit(1);
}

const DATABASE_URL = `postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_DATABASE}`;
console.log(`Connecting to performance database: ${DB_HOST}:${DB_PORT}/${DB_DATABASE}`);

// TypeORM DataSource Configuration for performance database
const dataSourceOptions: DataSourceOptions = {
  type: "postgres",
  url: DATABASE_URL,
  synchronize: false,
  logging: ["error", "warn"],
  entities: [User, UserProfile, AgeVerification],
};

const AppDataSource = new DataSource(dataSourceOptions);

async function seedAdminUser() {
  try {
    console.log("Initializing performance database connection...");
    await AppDataSource.initialize();
    console.log("Performance database connection initialized.");

    const userRepository = AppDataSource.getRepository(User);
    const userProfileRepository = AppDataSource.getRepository(UserProfile);

    // Check if admin user already exists
    const existingAdmin = await userRepository.findOne({
      where: { email: ADMIN_USER.email }
    });

    if (existingAdmin) {
      console.log(`Admin user already exists: ${ADMIN_USER.email}`);
      
      // Update to ensure it has admin role
      if (!existingAdmin.roles.includes(UserRole.ADMIN)) {
        existingAdmin.roles = [...existingAdmin.roles, UserRole.ADMIN];
        await userRepository.save(existingAdmin);
        console.log("✅ Updated existing user with ADMIN role");
      }
      
      return;
    }

    console.log("Creating admin user for background jobs testing...");

    // Generate password hash
    const passwordHash = await bcrypt.hash(ADMIN_USER.password, SALT_ROUNDS);

    // Create admin user
    const adminUser = new User();
    adminUser.email = ADMIN_USER.email;
    adminUser.username = ADMIN_USER.username;
    adminUser.displayName = ADMIN_USER.displayName;
    adminUser.passwordHash = passwordHash;
    adminUser.photoURL = 'https://via.placeholder.com/150/FF0000/FFFFFF/?text=ADMIN';
    adminUser.roles = [UserRole.USER, UserRole.ADMIN]; // Include both roles
    adminUser.status = UserStatus.ACTIVE;
    adminUser.isVerified = true;
    adminUser.isAgeVerified = true;

    // Add default location (San Francisco)
    adminUser.locationLatitude = 37.7749;
    adminUser.locationLongitude = -122.4194;

    const savedAdmin = await userRepository.save(adminUser);
    console.log(`✅ Admin user created: ${savedAdmin.id}`);

    // Create UserProfile for admin
    const adminProfile = new UserProfile();
    adminProfile.userId = savedAdmin.id;
    adminProfile.gender = Gender.OTHER;
    adminProfile.birthDate = new Date("1985-01-01");
    adminProfile.lastActiveAt = new Date();
    adminProfile.isPublic = true;

    await userProfileRepository.save(adminProfile);
    console.log("✅ Admin user profile created");

    console.log("\n🎉 Admin user setup complete!");
    console.log(`📧 Email: ${ADMIN_USER.email}`);
    console.log(`🔑 Password: ${ADMIN_USER.password}`);
    console.log(`👤 Username: ${ADMIN_USER.username}`);
    console.log(`🏷️ Roles: ${savedAdmin.roles.join(', ')}`);

  } catch (error) {
    console.error("Error during admin user seeding:", error);
    process.exitCode = 1;
  } finally {
    if (AppDataSource.isInitialized) {
      console.log("Closing database connection...");
      await AppDataSource.destroy();
      console.log("Database connection closed.");
    }
  }
}

// --- Run the Seeding ---
seedAdminUser(); 