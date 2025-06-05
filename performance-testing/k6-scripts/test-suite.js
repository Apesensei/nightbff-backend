import http from 'k6/http';
import { check, group, sleep, SharedArray } from 'k6';
import { Trend } from 'k6/metrics';

// --- Test Configuration ---
const VUS = __ENV.VUS || 10; // Start with a low number of virtual users for initial testing
const DURATION = __ENV.DURATION || '30s'; // Short duration for initial tests
const RAMP_UP_TIME = __ENV.RAMP_UP_TIME || '10s';
const RAMP_DOWN_TIME = __ENV.RAMP_DOWN_TIME || '10s';

const SLEEP_DURATION_NORMAL = parseInt(__ENV.SLEEP_NORMAL) || 1; // seconds
const SLEEP_DURATION_ERROR = parseInt(__ENV.SLEEP_ERROR) || 2; // seconds

// Base URLs for services (internal Docker service names and ports)
const AUTH_SERVICE_URL = __ENV.AUTH_SERVICE_URL || 'http://auth:3000';
const USER_SERVICE_URL = __ENV.USER_SERVICE_URL || 'http://user:3000';
const PLAN_SERVICE_URL = __ENV.PLAN_SERVICE_URL || 'http://plan:3000';
const VENUE_SERVICE_URL = __ENV.VENUE_SERVICE_URL || 'http://venue:3000';
// Add other service URLs as needed: EVENT_SERVICE_URL, VENUE_SERVICE_URL etc.

// --- Load Test Data ---
let tokens = [];
let userIds = []; // We might not need userIds if tokens map directly to users for these scenarios

try {
  const tokenData = open('/scripts/loadtest_tokens.json');
  tokens = JSON.parse(tokenData);
  // const userIdData = open('/scripts/loadtest_user_ids.txt'); // Keep if needed for other scenarios
  // userIds = userIdData.split('\\n').filter(id => id.trim() !== '');
  if (tokens.length === 0) {
    console.log("Warning: No tokens loaded from /scripts/loadtest_tokens.json");
  }
} catch (e) {
  console.log('Error loading test data: ' + e.message + ". Ensure files exist in the k6 container at /scripts/");
}

// --- Test Options ---
export const options = {
  stages: [
    { duration: RAMP_UP_TIME, target: VUS }, // Ramp-up
    { duration: DURATION, target: VUS }, // Steady state
    { duration: RAMP_DOWN_TIME, target: 0 }, // Ramp-down
  ],
  thresholds: {
    'http_req_failed': ['rate<0.05'], // http errors should be less than 5%
    'http_req_duration': ['p(95)<1000'], // 95% of requests should be below 1000ms
    'http_req_duration{scenario:fetch_own_profile}': ['p(95)<300'],
    'http_req_duration{scenario:fetch_trending_cities}': ['p(95)<400'],
    'http_req_duration{scenario:fetch_nearby_users}': ['p(95)<600'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// --- Helper Functions ---
function getRandomToken() {
  if (tokens.length === 0) {
    // console.log("getRandomToken: No tokens available"); // Avoid logging per call
    return null;
  }
  return tokens[Math.floor(Math.random() * tokens.length)];
}

// Helper to generate random coordinates around a central point (e.g., a city center)
// For simplicity, using a broad range. For realistic tests, center on known city lat/lng.
function getRandomCoordinates(centerLat = 34.0522, centerLng = -118.2437, range = 0.5) { // Defaults to LA
  return {
    latitude: centerLat + (Math.random() - 0.5) * range * 2,
    longitude: centerLng + (Math.random() - 0.5) * range * 2,
  };
}

// --- Test Scenarios ---
let loginTrend = new Trend('login_duration');
let fetchProfileTrend = new Trend('fetch_profile_duration');
let fetchTrendingCitiesTrend = new Trend('fetch_trending_cities_duration');
let fetchNearbyUsersTrend = new Trend('fetch_nearby_users_duration');
let createPlanTrend = new Trend('create_plan_duration');

export default function () {
  if (tokens.length === 0) {
    console.error("No tokens loaded. Skipping authenticated requests.");
    sleep(SLEEP_DURATION_ERROR);
    return;
  }

  let accessToken = null; // Will be set from login response

  // SCN00: User Login (New Scenario)
  group('SCN00: User Login', function () {
    const loginPayload = JSON.stringify({
      email: 'loadtest0@nightbff.dev', // Use a known seeded email pattern
      password: 'password123',      // Password from seeding script
    });

    const res = http.post(`${AUTH_SERVICE_URL}/api/auth/signin`, loginPayload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'Login', scenario: 'SCN00_UserLogin' }, 
    });

    loginTrend.add(res.timings.duration);

    const loginSuccess = check(res, {
      'Login: status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'Login: response has success': (r) => r.json() && r.json().success === true,
      'Login: response contains access_token': (r) => r.json() && r.json().data && r.json().data.session && r.json().data.session.accessToken,
    });

    if (loginSuccess && res.json() && res.json().data && res.json().data.session) {
      accessToken = res.json().data.session.accessToken;
      console.log(`✅ Login successful, got token: ${accessToken.substring(0,20)}...`);
    } else {
      console.error(`Login failed. VU: ${__VU}, Iter: ${__ITER}. Status: ${res.status}, Body: ${res.body}`)
      return; // Exit early if login fails
    }
    sleep(SLEEP_DURATION_NORMAL); 
  });

  // Use the dynamically obtained token instead of pre-generated ones
  if (!accessToken) {
    console.error("No access token available from login, skipping authenticated requests");
    sleep(1);
    return;
  }

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  group('SCN01: Fetch Own User Profile', function () {
    const res = http.get(`${USER_SERVICE_URL}/api/users/me/profile`, { 
      headers: headers,
      tags: { scenario: 'fetch_own_profile' }
    });
    check(res, {
      '[Profile Fetch] Status is 200': (r) => r.status === 200,
      '[Profile Fetch] Profile data received': (r) => r.json() !== null && typeof r.json("id") === 'string',
    });
    if (res.status !== 200) {
      console.log(`Fetch Own Profile failed: ${res.status} Token: ${accessToken.substring(0,10)}... Body: ${res.body}`);
    }
    sleep(1);
  });

  group('SCN02: Fetch Trending Cities', function () {
    const limit = 5;
    const res = http.get(`${PLAN_SERVICE_URL}/api/cities/trending?limit=${limit}`, {
      // This endpoint might not require auth, but sending it won't hurt
      headers: headers, 
      tags: { scenario: 'fetch_trending_cities' }
    });
    check(res, {
      '[Trending Cities] Status is 200': (r) => r.status === 200,
      '[Trending Cities] Received an array': (r) => Array.isArray(r.json()),
      '[Trending Cities] Array has items or is empty (as expected)': (r) => Array.isArray(r.json()),
    });
    if (res.status !== 200) {
      console.log(`Fetch Trending Cities failed: ${res.status} Body: ${res.body}`);
    }
    sleep(1);
  });

  group('SCN03: Fetch Nearby Users', function () {
    const coords = getRandomCoordinates();
    const radiusInKm = 10;
    const discoveryLimit = 20;
    const url = `${USER_SERVICE_URL}/api/users/discovery/nearby?latitude=${coords.latitude}&longitude=${coords.longitude}&radiusInKm=${radiusInKm}&limit=${discoveryLimit}`;
    
    const res = http.get(url, { 
      headers: headers,
      tags: { scenario: 'fetch_nearby_users' }
    });
    check(res, {
      '[Nearby Users] Status is 200': (r) => r.status === 200,
      '[Nearby Users] Response has users array': (r) => r.json() && Array.isArray(r.json("users")),
    });
    if (res.status !== 200) {
      console.log(`Fetch Nearby Users failed: ${res.status} URL: ${url} Body: ${res.body}`);
    }
    sleep(SLEEP_DURATION_NORMAL);
  });

  // SCN04: Create Plan (New Scenario)
  group('SCN04: Create Plan', function () {
    const planPayload = JSON.stringify({
      destination: "Test Destination City " + __VU + "-" + __ITER, // Make destination unique per VU/iter
      startDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD
      // endDate: // Optional
      // coverImage: // Optional
    });

    const res = http.post(`${PLAN_SERVICE_URL}/api/plans`, planPayload, {
      headers: headers, // Uses the dynamically obtained token
      tags: { name: 'CreatePlan', scenario: 'SCN04_CreatePlan' },
    });

    createPlanTrend.add(res.timings.duration);

    const createPlanSuccess = check(res, {
      'CreatePlan: status is 201': (r) => r.status === 201,
      'CreatePlan: response contains id': (r) => r.json() && r.json().id,
      'CreatePlan: response contains cityId': (r) => r.json() && r.json().cityId, // Assuming cityId is returned
    });

    if (!createPlanSuccess) {
      console.error(`Create Plan failed. VU: ${__VU}, Iter: ${__ITER}. Status: ${res.status}, Body: ${res.body}`);
    }
    sleep(SLEEP_DURATION_NORMAL);
  });

  sleep(1); // Think time at the end of a VU iteration
}

// Optional: Teardown function
// export function teardown(data) {
//   console.log('Test completed. Tokens loaded: ' + (tokens ? tokens.length : 0));
// } 