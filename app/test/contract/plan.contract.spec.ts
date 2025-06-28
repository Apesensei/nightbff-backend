import axios from "axios";
import { Pact, Matchers } from "@pact-foundation/pact";
import * as path from "path";
import { CreatePlanDto } from "../../src/microservices/plan/dto/create-plan.dto";

const { like, iso8601Date } = Matchers;

const provider = new Pact({
  consumer: "NightBFF-Frontend",
  provider: "NightBFF-Backend",
  port: 1235,
  log: path.resolve(process.cwd(), "logs", "pact-plan.log"),
  dir: path.resolve(process.cwd(), "pacts"),
  logLevel: "warn",
  spec: 2,
});

describe("Plan Service Pact Test (consumer-style)", () => {
  const planPath = "/api/plans";
  const mockAuthToken = "Bearer dummy-token";

  beforeAll(async () => {
    await provider.setup();
  });

  afterEach(async () => {
    await provider.verify();
  });

  afterAll(async () => {
    await provider.finalize();
  });

  it("creates a new plan and returns payload expected by frontend", async () => {
    const createPlanDto: CreatePlanDto = {
      destination: "Tokyo",
      startDate: "2025-10-15",
      endDate: "2025-10-20",
      coverImage: "https://example.com/tokyo.jpg",
    } as any;

    const expectedBody = {
      id: like("a-uuid-for-the-plan"),
      destination: like("Tokyo"),
      startDate: iso8601Date("2025-10-15"),
      endDate: iso8601Date("2025-10-20"),
      coverImage: like("https://example.com/tokyo.jpg"),
      user: {
        id: like("c6a9a2a3-9a3d-4e9e-b8d9-2e7a0e2a3b4c"),
      },
    };

    await provider.addInteraction({
      state: "a user is authenticated",
      uponReceiving: "a request to create a new plan",
      withRequest: {
        method: "POST",
        path: planPath,
        headers: {
          "Content-Type": "application/json",
          Authorization: mockAuthToken,
        },
        body: createPlanDto as any,
      },
      willRespondWith: {
        status: 201,
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: expectedBody,
      },
    });

    const response = await axios.post(
      `http://127.0.0.1:1235${planPath}`,
      createPlanDto,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: mockAuthToken,
        },
      },
    );

    expect(response.status).toBe(201);
    expect(response.data).toMatchObject({
      id: expect.any(String),
      destination: "Tokyo",
    });
  });
});
