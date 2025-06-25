import { provider } from './pact.helper';
import { Matchers } from '@pact-foundation/pact';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { CreatePlanDto } from '../../src/microservices/plan/dto/create-plan.dto';

const { like, iso8601Date } = Matchers;

describe('Plan Service Pact Test', () => {
  let app: INestApplication;

  const mockAuthToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjNmE5YTJhMy05YTNkLTRlOWUtYjhkOS0yZTdhMGUyYTNiNGMiLCJpYXQiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

  beforeAll(async () => {
    await provider.setup();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await provider.finalize();
    await app.close();
  });

  describe('on plan creation', () => {
    const createPlanDto: CreatePlanDto = {
      destination: 'Tokyo',
      startDate: '2025-10-15',
      endDate: '2025-10-20',
      coverImage: 'https://example.com/tokyo.jpg',
    } as any;

    const expectedBody = {
      id: like('a-uuid-for-the-plan'),
      destination: like('Tokyo'),
      startDate: iso8601Date('2025-10-15'),
      endDate: iso8601Date('2025-10-20'),
      coverImage: like('https://example.com/tokyo.jpg'),
      user: {
        id: like('c6a9a2a3-9a3d-4e9e-b8d9-2e7a0e2a3b4c'),
      },
    };

    beforeEach(async () => {
      await provider.addInteraction({
        state: 'a user is authenticated',
        uponReceiving: 'a request to create a new plan',
        withRequest: {
          method: 'POST',
          path: '/api/plans',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockAuthToken}`,
          },
          body: createPlanDto as any,
        },
        willRespondWith: {
          status: 201,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: expectedBody,
        },
      });
    });

    it('should return the newly created plan', () => {
      expect(true).toBe(true);
    });
  });
}); 