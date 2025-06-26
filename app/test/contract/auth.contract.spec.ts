import axios from 'axios';
import { provider } from './pact.helper';
import { Matchers } from '@pact-foundation/pact';

const { like } = Matchers;

describe('Auth Service Pact Test (consumer-style)', () => {
  const signinPath = '/api/auth/frontend/signin';

  beforeAll(() => provider.setup());
  afterEach(() => provider.verify());
  afterAll(() => provider.finalize());

  it('signs in a user and returns frontend-compatible payload', async () => {
    const expectedBody = {
      token: like('some.jwt.token'),
      user: {
        id: like('c6a9a2a3-9a3d-4e9e-b8d9-2e7a0e2a3b4c'),
        name: like('Test User'),
        email: like('test@user.com'),
      },
    };

    await provider.addInteraction({
      state: 'a user exists and credentials are valid',
      uponReceiving: 'a request to sign in for the frontend',
      withRequest: {
        method: 'POST',
        path: signinPath,
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

    const response = await axios.post(`http://localhost:1234${signinPath}`, {
      email: 'test@user.com',
      password: 'a-valid-password',
    });

    expect(response.status).toBe(200);
    expect(response.data).toMatchObject({
      token: expect.any(String),
      user: expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        email: expect.any(String),
      }),
    });
  });
}); 