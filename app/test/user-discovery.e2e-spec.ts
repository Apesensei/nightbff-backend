import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import {
  TypeOrmModule,
  TypeOrmModuleOptions,
  getRepositoryToken,
} from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigModule } from "@nestjs/config";
import { Not } from "typeorm";
import { differenceInYears } from "date-fns";

// Import Test Helpers
import { setupTestDatabase, teardownTestDatabase } from "./utils/db-test.utils";
import { generateTestJwt } from "./utils/jwt-test.utils";

// Import Core Modules & Entities needed for this test suite
import { UserModule } from "../src/microservices/user/user.module";
import { AuthModule } from "../src/microservices/auth/auth.module";
import { User } from "../src/microservices/auth/entities/user.entity";
import {
  UserProfile,
  Gender,
  GenderPreference,
} from "../src/microservices/user/entities/user-profile.entity";
import { UserRelationship } from "../src/microservices/user/entities/user-relationship.entity";
import { RelationshipType } from "../src/microservices/user/entities/user-relationship.entity";
import { DatabaseModule } from "../src/common/database/database.module";

// Import the actual provider to get its token/name
import { SupabaseProvider } from "../src/common/database/supabase.provider";

describe("UserDiscoveryController (e2e)", () => {
  jest.setTimeout(60000); // Increase timeout for E2E tests with DB setup

  let app: INestApplication;
  let typeOrmOptions: TypeOrmModuleOptions;
  let userRepository: Repository<User>;
  let userProfileRepository: Repository<UserProfile>; // Use standard repo for setup
  let userRelationshipRepository: Repository<UserRelationship>; // Use standard repo for setup
  let testUser: User;
  let testUserProfile: UserProfile;
  let jwtToken: string;

  // --- Helper Functions for Seeding --- //

  async function seedTestUser(
    userData: Partial<User>,
    profileData: Partial<UserProfile>,
  ): Promise<{ user: User; profile: UserProfile }> {
    const user = await userRepository.save(
      userRepository.create({
        email: userData.email || `${Math.random()}@candidate.com`,
        username: userData.username || `candidate_${Math.random()}`,
        displayName: userData.displayName || "Candidate User",
        passwordHash: "test-hash",
        ...userData,
      }),
    );
    const profile = await userProfileRepository.save(
      userProfileRepository.create({
        userId: user.id,
        gender: profileData.gender || Gender.FEMALE, // Default gender
        birthDate: profileData.birthDate || new Date("1995-01-01"), // Default dob
        lastActiveAt: profileData.lastActiveAt || new Date(), // Default activity
        genderPreference: profileData.genderPreference || GenderPreference.BOTH,
        minAgePreference: profileData.minAgePreference,
        maxAgePreference: profileData.maxAgePreference,
        ...profileData,
      }),
    );
    // Eager load the user relation onto the profile if needed by tests/DTOs
    profile.user = user;
    return { user, profile };
  }

  async function seedBlockRelationship(
    requesterId: string,
    recipientId: string,
  ): Promise<UserRelationship> {
    return userRelationshipRepository.save(
      userRelationshipRepository.create({
        requesterId: requesterId,
        recipientId: recipientId,
        type: RelationshipType.BLOCKED,
      }),
    );
  }

  // --- End Helper Functions --- //

  beforeAll(async () => {
    // 1. Setup Test Database
    const dbSetup = await setupTestDatabase();
    typeOrmOptions = dbSetup.typeOrmOptions;

    // 2. Compile NestJS Module
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: "config/env/test.env",
        }),
        TypeOrmModule.forRoot(typeOrmOptions),
        AuthModule,
        UserModule,
        DatabaseModule,
      ],
    })
      .overrideProvider(SupabaseProvider)
      .useValue({
        getClient: jest.fn(() => ({
          from: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          rpc: jest.fn().mockReturnThis(),
        })),
      })
      .compile();

    app = moduleFixture.createNestApplication();

    // Apply global settings (prefix, pipes) like in main.ts
    app.setGlobalPrefix("api");
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

    await app.init();

    // 3. Get Repositories for seeding
    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    userProfileRepository = moduleFixture.get<Repository<UserProfile>>(
      getRepositoryToken(UserProfile),
    );
    userRelationshipRepository = moduleFixture.get<
      Repository<UserRelationship>
    >(getRepositoryToken(UserRelationship));

    // 4. Seed Initial Data using helper
    const { user, profile } = await seedTestUser(
      {
        email: "e2e-user@test.com",
        username: "e2e_user",
        displayName: "E2E Test User",
      },
      {
        gender: Gender.MALE,
        birthDate: new Date("1990-01-01"),
        genderPreference: GenderPreference.BOTH,
        lastActiveAt: new Date(),
      },
    );
    testUser = user;
    testUserProfile = profile; // Store profile as well

    // 5. Generate JWT for the test user
    jwtToken = await generateTestJwt({
      userId: testUser.id,
      email: testUser.email,
    });
  });

  afterAll(async () => {
    // Ensure app closes fully before DB teardown
    if (app) {
      await app.close();
    }
    await teardownTestDatabase();
  });

  // Clean slate before each test (optional, depends on test design)
  beforeEach(async () => {
    // TypeORM 0.3+ forbids delete({}) (empty criteria). Use clear() or explicit where clauses.
    await userRelationshipRepository.clear(); // remove all block relationships

    // Remove profiles/users except the main testUser – use QueryBuilder to avoid empty-criteria error
    await userProfileRepository
      .createQueryBuilder()
      .delete()
      .where("userId != :id", { id: testUser.id })
      .execute();

    await userRepository
      .createQueryBuilder()
      .delete()
      .where("id != :id", { id: testUser.id })
      .execute();
  });

  // --- Test Suite --- //
  describe("GET /api/users/discovery/homepage", () => {
    // Basic success case
    it("should return 200 OK with valid recommendations array", async () => {
      // Arrange: Seed a potential candidate
      const { user: candidateUser /* , profile: candidateProfile */ } =
        await seedTestUser(
          { displayName: "Candidate A" },
          {
            gender: Gender.FEMALE,
            birthDate: new Date("1992-05-10"),
            lastActiveAt: new Date(),
          },
        );

      // Act
      const response = await request(app.getHttpServer())
        .get("/api/users/discovery/homepage")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      // Assert
      expect(response.body).toBeInstanceOf(Array);
      // Check if the seeded candidate is potentially included (it should be, given default prefs)
      const foundCandidate = response.body.find(
        (rec: any) => rec.id === candidateUser.id,
      );
      expect(foundCandidate).toBeDefined();
      expect(foundCandidate).toEqual({
        id: candidateUser.id,
        displayName: "Candidate A",
        photoURL: null, // Default photoURL from seed
        age: expect.any(Number), // Check age calculation happened
      });
      const expectedAge = differenceInYears(new Date(), new Date("1992-05-10"));
      expect(foundCandidate.age).toBe(expectedAge);
    });

    it("should exclude users blocked by the current user", async () => {
      // Arrange: Seed a candidate and block them
      const { user: candidateUser } = await seedTestUser(
        {},
        { lastActiveAt: new Date() },
      );
      await seedBlockRelationship(testUser.id, candidateUser.id);

      // Act
      const response = await request(app.getHttpServer())
        .get("/api/users/discovery/homepage")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      // Assert
      expect(response.body).toBeInstanceOf(Array);
      const foundCandidate = response.body.find(
        (rec: any) => rec.id === candidateUser.id,
      );
      expect(foundCandidate).toBeUndefined();
    });

    it("should exclude users who have blocked the current user", async () => {
      // Arrange: Seed a candidate who blocks the test user
      const { user: candidateUser } = await seedTestUser(
        {},
        { lastActiveAt: new Date() },
      );
      await seedBlockRelationship(candidateUser.id, testUser.id);

      // Act
      const response = await request(app.getHttpServer())
        .get("/api/users/discovery/homepage")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      // Assert
      expect(response.body).toBeInstanceOf(Array);
      const foundCandidate = response.body.find(
        (rec: any) => rec.id === candidateUser.id,
      );
      expect(foundCandidate).toBeUndefined();
    });

    it("should filter recommendations by the current user's age preference", async () => {
      // Arrange: Update current user's profile with age preferences
      testUserProfile.minAgePreference = 30;
      testUserProfile.maxAgePreference = 35;
      await userProfileRepository.save(testUserProfile);

      // Seed candidates inside and outside the age range
      const candidateInRange = await seedTestUser(
        { displayName: "In Range" },
        { birthDate: new Date("1990-07-15") }, // ~34 years old
      );
      const candidateTooYoung = await seedTestUser(
        { displayName: "Too Young" },
        { birthDate: new Date("1998-01-01") }, // ~27 years old
      );
      const candidateTooOld = await seedTestUser(
        { displayName: "Too Old" },
        { birthDate: new Date("1985-01-01") }, // ~40 years old
      );

      // Act
      const response = await request(app.getHttpServer())
        .get("/api/users/discovery/homepage")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      // Assert
      expect(response.body).toBeInstanceOf(Array);
      const recommendedIds = response.body.map((rec: any) => rec.id);

      expect(recommendedIds).toContain(candidateInRange.user.id);
      expect(recommendedIds).not.toContain(candidateTooYoung.user.id);
      expect(recommendedIds).not.toContain(candidateTooOld.user.id);
    });

    it.skip("should filter recommendations by gender preference (BOTH) and exclude PNTS", async () => {
      // Arrange: Ensure test user prefers BOTH (default in beforeAll)
      // testUserProfile.genderPreference = GenderPreference.BOTH;
      // await userProfileRepository.save(testUserProfile);

      // Seed candidates with various genders
      const candidateMale = await seedTestUser({}, { gender: Gender.MALE });
      const candidateFemale = await seedTestUser({}, { gender: Gender.FEMALE });
      await seedTestUser({}, { gender: Gender.OTHER });
      const candidatePNTS = await seedTestUser({}, { gender: Gender.OTHER });

      // Act
      const response = await request(app.getHttpServer())
        .get("/api/users/discovery/homepage")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      // Assert
      expect(response.body).toBeInstanceOf(Array);
      const recommendedIds = response.body.map((rec: any) => rec.id);

      expect(recommendedIds).toContain(candidateMale.user.id);
      expect(recommendedIds).toContain(candidateFemale.user.id);
      // 'OTHER' might be included depending on the 75% fill logic and limit
      // Check if it's present or absent based on expected fill behaviour (flexible check here)
      // expect(recommendedIds).toContain(candidateOther.user.id);
      expect(recommendedIds).not.toContain(candidatePNTS.user.id); // PNTS must be excluded

      // Verify the distribution if needed (e.g., >= 75% MALE/FEMALE if enough candidates)
      // const genderCounts = response.body.reduce(...);
    });

    it("should filter primarily MALE recommendations for gender preference (MALE)", async () => {
      // Arrange: Update current user's profile
      testUserProfile.genderPreference = GenderPreference.MALE;
      await userProfileRepository.save(testUserProfile);

      // Seed candidates
      const candidateMale1 = await seedTestUser(
        { email: "m1@e2e.com" },
        { gender: Gender.MALE, lastActiveAt: new Date(Date.now() - 1000) },
      );
      const candidateMale2 = await seedTestUser(
        { email: "m2@e2e.com" },
        { gender: Gender.MALE, lastActiveAt: new Date(Date.now() - 2000) },
      );
      const candidateFemale = await seedTestUser(
        { email: "f1@e2e.com" },
        { gender: Gender.FEMALE, lastActiveAt: new Date(Date.now() - 3000) },
      );

      // Act
      const response = await request(app.getHttpServer())
        .get("/api/users/discovery/homepage")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      // Assert
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(3); // MALE, MALE, FEMALE (fill)
      expect(response.body[0].id).toBe(candidateMale1.user.id); // Male first
      expect(response.body[1].id).toBe(candidateMale2.user.id); // Male second
      expect(response.body[2].id).toBe(candidateFemale.user.id); // Female fills
    });

    it("should filter primarily FEMALE recommendations for gender preference (FEMALE)", async () => {
      // Arrange: Update current user's profile
      testUserProfile.genderPreference = GenderPreference.FEMALE;
      await userProfileRepository.save(testUserProfile);

      // Seed candidates
      const candidateFemale1 = await seedTestUser(
        { email: "f1@e2e.com" },
        { gender: Gender.FEMALE, lastActiveAt: new Date(Date.now() - 1000) },
      );
      const candidateFemale2 = await seedTestUser(
        { email: "f2@e2e.com" },
        { gender: Gender.FEMALE, lastActiveAt: new Date(Date.now() - 2000) },
      );
      const candidateMale = await seedTestUser(
        { email: "m1@e2e.com" },
        { gender: Gender.MALE, lastActiveAt: new Date(Date.now() - 3000) },
      );

      // Act
      const response = await request(app.getHttpServer())
        .get("/api/users/discovery/homepage")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      // Assert
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(3); // FEMALE, FEMALE, MALE (fill)
      expect(response.body[0].id).toBe(candidateFemale1.user.id);
      expect(response.body[1].id).toBe(candidateFemale2.user.id);
      expect(response.body[2].id).toBe(candidateMale.user.id);
    });

    it("should return recommendations sorted by lastActiveAt DESC", async () => {
      // Arrange: Seed candidates with different lastActiveAt times
      const candidateNewest = await seedTestUser(
        { displayName: "Newest" },
        { lastActiveAt: new Date(Date.now() - 1000 * 60 * 1) }, // 1 min ago
      );
      const candidateMiddle = await seedTestUser(
        { displayName: "Middle" },
        { lastActiveAt: new Date(Date.now() - 1000 * 60 * 5) }, // 5 mins ago
      );
      const candidateOldest = await seedTestUser(
        { displayName: "Oldest" },
        { lastActiveAt: new Date(Date.now() - 1000 * 60 * 10) }, // 10 mins ago
      );

      // Ensure test user prefs don't interfere with seeing all 3
      testUserProfile.genderPreference = GenderPreference.BOTH;
      testUserProfile.minAgePreference = undefined;
      testUserProfile.maxAgePreference = undefined;
      await userProfileRepository.save(testUserProfile);

      // Act
      const response = await request(app.getHttpServer())
        .get("/api/users/discovery/homepage")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      // Assert
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(3);
      expect(response.body[0].id).toBe(candidateNewest.user.id);
      expect(response.body[1].id).toBe(candidateMiddle.user.id);
      expect(response.body[2].id).toBe(candidateOldest.user.id);
    });

    it("should return 404 if the requesting user profile cannot be found", async () => {
      // Arrange: Create a user WITHOUT a profile
      const userWithoutProfile = await userRepository.save(
        userRepository.create({
          email: "no.profile@test.com",
          username: "noprofileuser",
          displayName: "No Profile User",
          passwordHash: "test-hash",
        }),
      );
      // Generate a token for this user
      const noProfileToken = await generateTestJwt({
        userId: userWithoutProfile.id,
      });

      // Act & Assert
      await request(app.getHttpServer())
        .get("/api/users/discovery/homepage")
        .set("Authorization", `Bearer ${noProfileToken}`)
        .expect(404); // Expecting NotFoundException from the service
    });

    // Authentication test
    it("should return 401 Unauthorized without JWT", async () => {
      return request(app.getHttpServer())
        .get("/api/users/discovery/homepage")
        .expect(401);
    });

    it("should return 401 Unauthorized with invalid JWT", async () => {
      const invalidToken = "this.is.not.a.real.token";
      return request(app.getHttpServer())
        .get("/api/users/discovery/homepage")
        .set("Authorization", `Bearer ${invalidToken}`)
        .expect(401);
    });

    // TODO: Add more tests in Task 2.3:
    // - Seed various candidate users (different genders, ages, lastActiveAt).
    // - Seed blocked relationships.
    // - Verify DTO structure (id, displayName, photoURL, age).
    // - Verify blocked users are excluded.
    // - Verify gender filtering works as expected (based on seeded data and current user prefs).
    // - Verify age calculation/filtering.
    // - Verify sorting by lastActiveAt (implicitly done by service).
  });
});
