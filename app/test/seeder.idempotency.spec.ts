import "reflect-metadata";
import { Test } from "@nestjs/testing";
import { SeederModule } from "../src/database/seeds/seeder.module";
import { SeederService } from "../src/database/seeds/seeder.service";
import { Repository } from "typeorm";
import { User } from "../src/microservices/auth/entities/user.entity";
import { getRepositoryToken } from "@nestjs/typeorm";

describe("SeederService idempotency", () => {
  let seederService: SeederService;
  let userRepository: Repository<User>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SeederModule],
    }).compile();

    seederService = moduleRef.get(SeederService);
    userRepository = moduleRef.get<Repository<User>>(getRepositoryToken(User));
  });

  afterAll(async () => {
    // Close the underlying DB connection to avoid Jest open-handle warnings
    const ds = userRepository.manager.connection;
    if (ds && ds.isInitialized) {
      await ds.destroy();
    }
  });

  it("creates admin user on first run", async () => {
    await seederService.seed();
    const count = await userRepository.count({ where: { email: "admin-loadtest@nightbff.dev" } });
    expect(count).toBe(1);
  });

  it("is idempotent on subsequent runs", async () => {
    await seederService.seed();
    const count = await userRepository.count({ where: { email: "admin-loadtest@nightbff.dev" } });
    expect(count).toBe(1);
  });
}); 