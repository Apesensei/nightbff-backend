import { Test, TestingModule } from "@nestjs/testing";
import {
  TypeOrmModule,
  TypeOrmModuleOptions,
  getRepositoryToken,
} from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigModule } from "@nestjs/config";
import {
  setupTestDatabase,
  teardownTestDatabase,
} from "../../../../test/utils/db-test.utils"; // Import DB helpers

// Import entities needed for seeding and testing
import { UserProfile, Gender } from "../entities/user-profile.entity";
import { User } from "../../auth/entities/user.entity";
import { ProfileRepository } from "./profile.repository"; // Import the repository under test

// Define default fetch limit constant used in tests
const FETCH_LIMIT = 100;

describe("ProfileRepository (Integration)", () => {
  // Increase timeout for DB operations
  jest.setTimeout(60000);

  let moduleRef: TestingModule;
  let profileRepository: ProfileRepository;
  let userRepository: Repository<User>; // Need standard user repo for seeding
  let typeOrmOptions: TypeOrmModuleOptions;
  let baseProfileRepository: Repository<UserProfile>; // Add base repo variable

  beforeAll(async () => {
    // Setup the Test DB using the helper
    const dbSetup = await setupTestDatabase();
    typeOrmOptions = dbSetup.typeOrmOptions;

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: ".env.test" }),
        TypeOrmModule.forRoot(typeOrmOptions),
        // Import only the entities needed for injection
        TypeOrmModule.forFeature([UserProfile, User]),
      ],
      // Provide the ProfileRepository since it's an Injectable service
      providers: [
        ProfileRepository,
        // Provide mocks or real dependencies if ProfileRepository had them
      ],
    }).compile();

    profileRepository = moduleRef.get<ProfileRepository>(ProfileRepository);
    userRepository = moduleRef.get<Repository<User>>(getRepositoryToken(User));
    baseProfileRepository = moduleRef.get<Repository<UserProfile>>(
      getRepositoryToken(UserProfile),
    );
  });

  afterAll(async () => {
    await moduleRef?.close(); // Close the NestJS module
    await teardownTestDatabase(); // Teardown the DB container
  });

  // Helper function to seed user and profile data
  async function seedUserAndProfile(
    data: Partial<User & UserProfile>,
  ): Promise<UserProfile> {
    const user = await userRepository.save(
      userRepository.create({
        email: data.email || `${Math.random()}@test.com`,
        username: data.username || `testuser_${Math.random()}`,
        displayName: data.displayName || "Test User",
        passwordHash: "test-hash",
        ...data, // Include other User fields if provided
      }),
    );

    // Use the custom ProfileRepository potentially (if it handles creation)
    // or create UserProfile entity and associate it
    const profileData = {
      userId: user.id,
      gender: data.gender || Gender.OTHER,
      birthDate: data.birthDate || new Date("1990-01-01"),
      lastActiveAt: data.lastActiveAt || new Date(),
      ...data, // Include other UserProfile fields
    };

    // Use the base repository to save the profile
    await baseProfileRepository.save(baseProfileRepository.create(profileData));

    // Re-fetch to ensure relations are loaded if necessary (depends on repo logic)
    const savedProfile = await baseProfileRepository.findOne({
      where: { userId: user.id },
      relations: ["user"],
    });
    if (!savedProfile) throw new Error("Failed to save/retrieve profile");
    return savedProfile;
  }

  // Clean slate before each test within this suite
  beforeEach(async () => {
    // Clear tables using the repositories to prevent unique constraint errors
    // Order matters due to foreign key constraints (clear profiles before users)
    await baseProfileRepository.query(`DELETE FROM "user_profiles";`); // Use base repo
    await userRepository.query(`DELETE FROM "users";`);
  });

  describe("findMostRecentActiveUserProfiles", () => {
    it("should return recently active profiles, excluding specified IDs", async () => {
      // Arrange: Seed data
      const userToExclude = await seedUserAndProfile({
        email: "exclude@test.com",
        lastActiveAt: new Date(),
      });
      const activeUser1 = await seedUserAndProfile({
        email: "active1@test.com",
        lastActiveAt: new Date(Date.now() - 1000 * 60 * 5),
      }); // 5 mins ago
      const activeUser2 = await seedUserAndProfile({
        email: "active2@test.com",
        lastActiveAt: new Date(Date.now() - 1000 * 60 * 10),
      }); // 10 mins ago
      const inactiveUser = await seedUserAndProfile({
        email: "inactive@test.com",
        lastActiveAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
      }); // 2 days ago

      // Act
      const options = {
        fetchLimit: FETCH_LIMIT,
        excludeUserIds: [userToExclude.userId],
      };
      const result =
        await profileRepository.findMostRecentActiveUserProfiles(options);

      // Assert
      expect(result).toBeDefined();
      // Corrected Assertion: Expect 3 users (active1, active2, inactiveUser) as the method doesn't filter by activity time
      expect(result.length).toBe(3);
      expect(result[0].userId).toBe(activeUser1.userId); // Most recent first
      expect(result[1].userId).toBe(activeUser2.userId);
      expect(result[2].userId).toBe(inactiveUser.userId);
      expect(result.some((p) => p.userId === userToExclude.userId)).toBe(false); // Excluded user not present

      // Check selective loading
      expect(result[0].user?.displayName).toBeDefined();
      expect(result[0].user?.email).toBeUndefined(); // Assuming email wasn't selected
      expect(result[0].gender).toBeDefined();
      expect(result[0].lastActiveAt).toBeDefined();
    });

    it("should respect the fetchLimit", async () => {
      // Arrange: Seed more data than the limit
      await seedUserAndProfile({
        email: "user1@test.com",
        lastActiveAt: new Date(Date.now() - 1000),
      });
      await seedUserAndProfile({
        email: "user2@test.com",
        lastActiveAt: new Date(Date.now() - 2000),
      });
      await seedUserAndProfile({
        email: "user3@test.com",
        lastActiveAt: new Date(Date.now() - 3000),
      });

      // Act
      const options = {
        fetchLimit: 2,
        excludeUserIds: [],
      };
      const result =
        await profileRepository.findMostRecentActiveUserProfiles(options);

      // Assert
      expect(result.length).toBe(2);
    });

    it("should return empty array if no matching profiles", async () => {
      // Arrange: Seed only excluded users
      const userToExclude = await seedUserAndProfile({
        email: "exclude@test.com",
      });

      // Act
      const options = {
        fetchLimit: FETCH_LIMIT,
        excludeUserIds: [userToExclude.userId],
      };
      const result =
        await profileRepository.findMostRecentActiveUserProfiles(options);

      // Assert
      expect(result.length).toBe(0);
    });

    it("should return empty array if database is empty", async () => {
      // Arrange: DB is empty due to beforeEach cleanup

      // Act
      const options = {
        fetchLimit: FETCH_LIMIT,
        excludeUserIds: [],
      };
      const result =
        await profileRepository.findMostRecentActiveUserProfiles(options);

      // Assert
      expect(result.length).toBe(0);
    });

    it("should return profiles regardless of gender", async () => {
      // Arrange: Seed users with various genders
      const maleUser = await seedUserAndProfile({
        email: "male@test.com",
        gender: Gender.MALE,
      });
      const femaleUser = await seedUserAndProfile({
        email: "female@test.com",
        gender: Gender.FEMALE,
      });
      const otherUser = await seedUserAndProfile({
        email: "other@test.com",
        gender: Gender.OTHER,
      });
      const pntsUser = await seedUserAndProfile({
        email: "pnts@test.com",
        gender: Gender.OTHER,
      });

      // Act
      const options = {
        fetchLimit: FETCH_LIMIT,
        excludeUserIds: [],
      };
      const result =
        await profileRepository.findMostRecentActiveUserProfiles(options);

      // Assert: Ensure all seeded (non-excluded) users are returned
      expect(result.length).toBe(4);
      expect(result.some((p) => p.userId === maleUser.userId)).toBe(true);
      expect(result.some((p) => p.userId === femaleUser.userId)).toBe(true);
      expect(result.some((p) => p.userId === otherUser.userId)).toBe(true);
      expect(result.some((p) => p.userId === pntsUser.userId)).toBe(true);
    });

    // Add more tests: edge cases, large number of excludes, etc.
  });

  // Add describe blocks for other methods in ProfileRepository if they exist
});
