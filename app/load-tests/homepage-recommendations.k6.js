import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// --- Configuration --- //

// Target API base URL (replace with your staging/dev environment)
const API_BASE_URL = __ENV.API_URL || 'http://localhost:3000/api';

// Load test parameters
const VUS = __ENV.VUS || 100;       // Number of concurrent virtual users
const DURATION = __ENV.DURATION || '1m'; // Total duration of the test
const RAMP_UP_TIME = __ENV.RAMP_UP || '10s'; // Time to ramp up to full VUs
const RAMP_DOWN_TIME = __ENV.RAMP_DOWN || '10s'; // Time to ramp down VUs

// NFR Thresholds (modify as needed)
const P95_LATENCY_MS = __ENV.P95_THRESHOLD || 1000; // Milliseconds
const ERROR_RATE = __ENV.ERROR_THRESHOLD || '0.01'; // Max 1% errors

// --- Test User JWTs --- //
/*
 * IMPORTANT: Generate JWTs for test users and place them here.
 * Use the app/test/utils/jwt-test.utils.ts helper.
 * Example generation script (run from `app/` directory):
 *
 *   // generate-tokens.ts
 *   import { generateTestJwt } from './test/utils/jwt-test.utils';
 *   import * as fs from 'fs';
 *
 *   const userIds = ['user-id-1', 'user-id-2', ..., 'user-id-N']; // Replace with actual test user IDs
 *   const tokens = [];
 *
 *   async function generate() {
 *     for (const userId of userIds) {
 *       const token = await generateTestJwt({ userId });
 *       tokens.push({ userId, token });
 *     }
 *     fs.writeFileSync('./load-tests/test-tokens.json', JSON.stringify(tokens, null, 2));
 *     console.log(`Generated ${tokens.length} tokens to ./load-tests/test-tokens.json`);
 *   }
 *   generate();
 *
 * Then run: `npx ts-node generate-tokens.ts`
 *
 * Consider security implications if committing tokens.
 * Best practice: Load tokens from a secure source or environment variables.
 */

// Option 1: Load from a JSON file (created by generate-tokens.js)
// Ensure loadtest_tokens.json is in the correct relative path from where k6 is run (usually project root or app/)
const testTokens = new SharedArray('testTokens', function () {
  try {
    // Adjust path if needed, assuming k6 runs from `app/` directory
    // Path needs to be relative to the script file itself, or use an absolute path if k6 supports it.
    // Trying path relative to script:
    return JSON.parse(open('../scripts/loadtest_tokens.json')); 
  } catch (e) {
    console.error("Failed to load ../scripts/loadtest_tokens.json. Ensure it exists and is valid JSON.", e);
    // Return a dummy array to prevent script failure, but tests will likely fail auth.
    return [{ userId: 'dummy-user', token: 'dummy-token-please-generate' }];
  }
});

// Option 2: Embed a small number of tokens directly (Less flexible, more secure if not committed)
// This is now a fallback/example, Option 1 is preferred.
const _placeholderTokens_IGNORE = [
  {
    userId: 'placeholder-user-1',
    token: 'GENERATED_TOKENS_LOADED_VIA_OPTION_1' // Example placeholder
  },
];

// Check if tokens were loaded successfully from the file
if (!testTokens || testTokens.length === 0 || (testTokens[0].userId === 'dummy-user' && testTokens[0].token === 'dummy-token-please-generate')) {
    console.error("ERROR: JWT Tokens not loaded correctly from ../scripts/loadtest_tokens.json! Please ensure the file exists and contains valid tokens.");
    // k6 doesnt have a clean exit command, rely on checks failing
}

// --- Test Options --- //
export const options = {
  scenarios: {
    homepage_recommendations: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: RAMP_UP_TIME, target: VUS }, // Ramp up
        { duration: DURATION, target: VUS },     // Stay at peak
        { duration: RAMP_DOWN_TIME, target: 0 }, // Ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: [`rate<${ERROR_RATE}`], // Error rate threshold
    http_req_duration: [`p(95)<${P95_LATENCY_MS}`], // P95 latency threshold
  },
};

// --- Test Logic --- //
export default function () {
  // Select a test user token based on the VU id
  const vuId = __VU; // k6 virtual user ID (1-based)
  const tokenIndex = (vuId - 1) % testTokens.length;
  // Ensure we handle cases where the token might be directly a string (from JSON)
  // or an object {token: '...'} if the JSON structure was different
  const selectedToken = typeof testTokens[tokenIndex] === 'string' 
                          ? testTokens[tokenIndex] 
                          : testTokens[tokenIndex]?.token; 

  if (!selectedToken) {
      console.error(`Could not get token for VU ${vuId} at index ${tokenIndex}`);
      // Skip iteration if token is missing
      return; 
  }

  // Define headers
  const headers = {
    'Authorization': `Bearer ${selectedToken}`,
    'Content-Type': 'application/json',
  };

  // Make the GET request
  const res = http.get(`${API_BASE_URL}/users/discovery/homepage`, { headers });

  // Check response status
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response body is an array': (r) => Array.isArray(r.json()),
  });

  // Add a short sleep between iterations (e.g., 1 second)
  sleep(1);
} 