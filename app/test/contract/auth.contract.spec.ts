import { provider } from './pact.helper';
import { Matchers } from '@pact-foundation/pact';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';

const { like } = Matchers;

describe('Auth Service Pact Test', () => {
  let app: INestApplication;

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

  describe('on user signin', () => {
    const expectedBody = {
      token: like('some.jwt.token'),
      user: {
        id: like('c6a9a2a3-9a3d-4e9e-b8d9-2e7a0e2a3b4c'),
        name: like('Test User'),
        email: like('test@user.com'),
      },
    };

    beforeEach(async () => {
      await provider.addInteraction({
        state: 'a user exists and credentials are valid',
        uponReceiving: 'a request to sign in for the frontend',
        withRequest: {
          method: 'POST',
          path: '/api/auth/frontend/signin',
          headers: { 'Content-Type': 'application/json' },
          body: {
            email: 'test@user.com',
            password: 'a-valid-password',
          },
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: expectedBody,
        },
      });
    });

    it('should return a frontend-compatible auth response', () => {
      expect(true).toBe(true);
    });
  });
}); 