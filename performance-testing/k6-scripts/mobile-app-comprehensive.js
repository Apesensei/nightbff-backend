import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';

// =================================================================
// 📱 NIGHTBFF MOBILE APP - COMPREHENSIVE PERFORMANCE TEST SUITE
// =================================================================
// Tests Plan functionality: City resolution, plan creation, trending data,
// location-based features, RPC communication, and cache performance
// Designed for iOS mobile app usage patterns and performance standards

// --- PERFORMANCE CONFIGURATION ---
const VUS = parseInt(__ENV.VUS) || 5;          // Start conservative for plan functionality
const DURATION = __ENV.DURATION || '2m';       // Longer test for comprehensive coverage
const RAMP_UP_TIME = __ENV.RAMP_UP_TIME || '30s';
const RAMP_DOWN_TIME = __ENV.RAMP_DOWN_TIME || '30s';

// Mobile app sleep patterns (realistic usage)
const SLEEP_BETWEEN_ACTIONS = 2;    // User thinking time
const SLEEP_QUICK_ACTION = 0.5;     // Quick successive actions
const SLEEP_LOCATION_UPDATE = 1;    // Location update frequency

// --- SERVICE URLS (Docker Internal Network) ---
const AUTH_SERVICE_URL = __ENV.AUTH_SERVICE_URL || 'http://auth:3000';
const USER_SERVICE_URL = __ENV.USER_SERVICE_URL || 'http://user:3000';
const PLAN_SERVICE_URL = __ENV.PLAN_SERVICE_URL || 'http://plan:3000';
const VENUE_SERVICE_URL = __ENV.VENUE_SERVICE_URL || 'http://venue:3000';
const EVENT_SERVICE_URL = __ENV.EVENT_SERVICE_URL || 'http://event:3000';

// --- LOAD TEST DATA ---
let tokens = [];
let userIds = [];

try {
  const tokenData = open('/scripts/loadtest_tokens.json');
  tokens = JSON.parse(tokenData);
  const userIdData = open('/scripts/loadtest_user_ids.txt');
  userIds = userIdData.split('\n').filter(id => id.trim() !== '');
  
  console.log(`✅ Loaded ${tokens.length} tokens and ${userIds.length} user IDs`);
  if (tokens.length === 0) {
    throw new Error("No tokens loaded from loadtest_tokens.json");
  }
} catch (e) {
  console.error('❌ Error loading test data:', e.message);
  console.error('Ensure /scripts/loadtest_tokens.json and /scripts/loadtest_user_ids.txt exist');
}

// --- TEST OPTIONS & THRESHOLDS ---
export const options = {
  stages: [
    { duration: RAMP_UP_TIME, target: VUS },     // Gradual ramp-up
    { duration: DURATION, target: VUS },         // Sustained load
    { duration: RAMP_DOWN_TIME, target: 0 },     // Graceful ramp-down
  ],
  thresholds: {
    // 📱 iOS Mobile App Performance Standards
    'http_req_failed': ['rate<0.01'],                                    // < 1% error rate
    'http_req_duration': ['p(95)<1000'],                                 // Overall P95 < 1s
    'http_req_duration{endpoint:login}': ['p(95)<400'],                  // Login critical path
    'http_req_duration{endpoint:plan_creation}': ['p(95)<1000'],         // Core feature
    'http_req_duration{endpoint:location_update}': ['p(95)<500'],        // Frequent operation
    'http_req_duration{endpoint:trending_cities}': ['p(95)<300'],        // Cached endpoint
    'http_req_duration{endpoint:nearby_users}': ['p(95)<600'],           // Spatial query
    'http_req_duration{endpoint:city_details}': ['p(95)<400'],           // Cached endpoint
    'http_req_duration{endpoint:trending_events}': ['p(95)<500'],        // Social discovery
    
    // 🎯 Business Logic Thresholds
    'plan_creation_success_rate': ['rate>0.95'],                        // 95% plan creation success
    'city_resolution_success_rate': ['rate>0.90'],                      // 90% city resolution success
    'cache_hit_effectiveness': ['rate>0.80'],                           // 80% cache effectiveness
    'rpc_communication_success': ['rate>0.95'],                         // 95% RPC success
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// --- CUSTOM METRICS ---
const planCreationRate = new Rate('plan_creation_success_rate');
const cityResolutionRate = new Rate('city_resolution_success_rate');
const cacheHitRate = new Rate('cache_hit_effectiveness');
const rpcCommunicationRate = new Rate('rpc_communication_success');

const loginDuration = new Trend('login_duration', true);
const planCreationDuration = new Trend('plan_creation_duration', true);
const locationUpdateDuration = new Trend('location_update_duration', true);
const spatialQueryDuration = new Trend('spatial_query_duration', true);

// --- HELPER FUNCTIONS ---
function getRandomToken() {
  if (tokens.length === 0) return null;
  return tokens[Math.floor(Math.random() * tokens.length)];
}

function getRandomUserId() {
  if (userIds.length === 0) return null;
  return userIds[Math.floor(Math.random() * userIds.length)];
}

// Generate coordinates around major nightlife cities
function getRandomCoordinates() {
  const cities = [
    { name: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
    { name: 'New York', lat: 40.7128, lng: -74.0060 },
    { name: 'Miami', lat: 25.7617, lng: -80.1918 },
    { name: 'Las Vegas', lat: 36.1699, lng: -115.1398 },
    { name: 'San Francisco', lat: 37.7749, lng: -122.4194 },
  ];
  
  const city = cities[Math.floor(Math.random() * cities.length)];
  const range = 0.1; // ~10km radius
  
  return {
    latitude: city.lat + (Math.random() - 0.5) * range * 2,
    longitude: city.lng + (Math.random() - 0.5) * range * 2,
    cityName: city.name
  };
}

// Generate realistic plan destinations
function getRandomDestination() {
  const destinations = [
    'Beverly Hills, CA',
    'Times Square, New York',
    'South Beach, Miami',
    'The Strip, Las Vegas',
    'Nob Hill, San Francisco',
    'West Hollywood, CA',
    'Lower East Side, NYC',
    'Wynwood, Miami',
    'Downtown Las Vegas',
    'Mission District, SF'
  ];
  return destinations[Math.floor(Math.random() * destinations.length)];
}

// Generate future dates for plans
function getRandomFutureDate() {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 30) + 1); // 1-30 days future
  return futureDate.toISOString().split('T')[0];
}

// --- MAIN TEST EXECUTION ---
export default function () {
  if (tokens.length === 0) {
    console.error("❌ No tokens loaded. Skipping test execution.");
    sleep(5);
    return;
  }

  let accessToken = null;
  let currentUserId = null;

  // 🔐 AUTHENTICATION FLOW
  group('📱 App Launch & Authentication', function () {
    // Simulate realistic app launch with dynamic login
    const randomUserIndex = Math.floor(Math.random() * Math.min(tokens.length, userIds.length));
    const loginPayload = JSON.stringify({
      email: `loadtest${randomUserIndex}@nightbff.dev`,
      password: 'password123',
    });

    const loginStart = Date.now();
    const res = http.post(`${AUTH_SERVICE_URL}/api/auth/signin`, loginPayload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'login', flow: 'authentication' },
    });
    
    loginDuration.add(Date.now() - loginStart);

    const loginSuccess = check(res, {
      '🔐 Login Status 200': (r) => r.status === 200,
      '🔐 Response has success flag': (r) => r.json() && r.json().success === true,
      '🔐 Access token present': (r) => {
        const data = r.json();
        return data && data.data && data.data.session && data.data.session.accessToken;
      },
    });

    if (loginSuccess && res.json() && res.json().data && res.json().data.session) {
      accessToken = res.json().data.session.accessToken;
      currentUserId = userIds[randomUserIndex] || `test-user-${randomUserIndex}`;
      console.log(`✅ Login successful for user ${currentUserId.substring(0, 8)}...`);
    } else {
      console.error(`❌ Login failed. Status: ${res.status}, Body: ${res.body.substring(0, 200)}`);
      return;
    }
    
    sleep(SLEEP_QUICK_ACTION);
  });

  if (!accessToken || !currentUserId) {
    console.error("❌ Authentication failed, skipping authenticated tests");
    sleep(2);
    return;
  }

  const authHeaders = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  // 📍 LOCATION-BASED FEATURES FLOW
  group('📍 Location Services & User Discovery', function () {
    const coordinates = getRandomCoordinates();
    
    // Test location update (triggers city resolution & venue scanning)
    const locationPayload = JSON.stringify({
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    });

    const locationStart = Date.now();
    const locationRes = http.post(`${USER_SERVICE_URL}/api/user/location`, locationPayload, {
      headers: authHeaders,
      tags: { endpoint: 'location_update', flow: 'location_services' },
    });
    locationUpdateDuration.add(Date.now() - locationStart);

    check(locationRes, {
      '📍 Location Update Success': (r) => r.status === 204 || r.status === 200,
    });

    sleep(SLEEP_LOCATION_UPDATE);

    // Test nearby users discovery (spatial query performance)
    const spatialStart = Date.now();
    const nearbyRes = http.get(
      `${USER_SERVICE_URL}/api/users/discovery/nearby?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}&radiusInKm=10&limit=20`,
      {
        headers: authHeaders,
        tags: { endpoint: 'nearby_users', flow: 'spatial_query' },
      }
    );
    spatialQueryDuration.add(Date.now() - spatialStart);

    const spatialSuccess = check(nearbyRes, {
      '📍 Nearby Users Query Success': (r) => r.status === 200,
      '📍 Response has users array': (r) => r.json() && Array.isArray(r.json().users),
    });

    if (spatialSuccess) {
      console.log(`✅ Found ${nearbyRes.json().users.length} nearby users in ${coordinates.cityName}`);
    }

    sleep(SLEEP_BETWEEN_ACTIONS);
  });

  // 🏙️ SOCIAL DISCOVERY FLOW
  group('🏙️ Social Discovery & Trending Data', function () {
    // Test trending cities (cached endpoint performance)
    const trendingCitiesRes = http.get(`${PLAN_SERVICE_URL}/api/cities/trending?limit=10`, {
      headers: authHeaders,
      tags: { endpoint: 'trending_cities', flow: 'social_discovery' },
    });

    const citiesSuccess = check(trendingCitiesRes, {
      '🏙️ Trending Cities Success': (r) => r.status === 200,
      '🏙️ Cities array returned': (r) => Array.isArray(r.json()),
    });

    // Cache effectiveness check
    const cacheHeader = trendingCitiesRes.headers['X-Cache'] || trendingCitiesRes.headers['x-cache'];
    cacheHitRate.add(cacheHeader === 'HIT');

    if (citiesSuccess && trendingCitiesRes.json().length > 0) {
      const randomCity = trendingCitiesRes.json()[Math.floor(Math.random() * trendingCitiesRes.json().length)];
      
      // Test city details (cached endpoint with aggregation)
      const cityDetailsRes = http.get(`${PLAN_SERVICE_URL}/api/cities/${randomCity.id}/details`, {
        headers: authHeaders,
        tags: { endpoint: 'city_details', flow: 'social_discovery' },
      });

      check(cityDetailsRes, {
        '🏙️ City Details Success': (r) => r.status === 200,
        '🏙️ City data complete': (r) => r.json() && r.json().id === randomCity.id,
      });
    }

    sleep(SLEEP_QUICK_ACTION);

    // Test trending events/plans
    const trendingEventsRes = http.get(`${EVENT_SERVICE_URL}/api/events/trending?limit=10`, {
      headers: authHeaders,
      tags: { endpoint: 'trending_events', flow: 'social_discovery' },
    });

    check(trendingEventsRes, {
      '🏙️ Trending Events Success': (r) => r.status === 200,
      '🏙️ Events data structure': (r) => r.json() && typeof r.json() === 'object',
    });

    sleep(SLEEP_BETWEEN_ACTIONS);
  });

  // 📅 PLAN CREATION FLOW (CORE FEATURE)
  group('📅 Plan Creation & City Resolution', function () {
    const destination = getRandomDestination();
    const startDate = getRandomFutureDate();
    
    const planPayload = JSON.stringify({
      destination: destination,
      startDate: startDate,
      endDate: startDate, // Same day plan for simplicity
    });

    console.log(`🎯 Creating plan for destination: ${destination}`);

    const planStart = Date.now();
    const planRes = http.post(`${PLAN_SERVICE_URL}/api/plans`, planPayload, {
      headers: authHeaders,
      tags: { endpoint: 'plan_creation', flow: 'core_feature' },
    });
    planCreationDuration.add(Date.now() - planStart);

    const planSuccess = check(planRes, {
      '📅 Plan Creation Success': (r) => r.status === 201,
      '📅 Plan has ID': (r) => r.json() && r.json().id,
      '📅 Plan has city relation': (r) => r.json() && r.json().city,
      '📅 City resolution successful': (r) => {
        const city = r.json() && r.json().city;
        return city && city.id && city.name;
      },
    });

    // Track business metrics
    planCreationRate.add(planSuccess);
    
    if (planSuccess) {
      const plan = planRes.json();
      cityResolutionRate.add(!!plan.city);
      rpcCommunicationRate.add(true); // Successful plan creation implies successful RPC communication
      
      console.log(`✅ Plan created successfully: ${plan.id.substring(0, 8)}... in ${plan.city.name}`);
    } else {
      cityResolutionRate.add(false);
      rpcCommunicationRate.add(false);
      console.error(`❌ Plan creation failed. Status: ${planRes.status}, Body: ${planRes.body.substring(0, 200)}`);
    }

    sleep(SLEEP_BETWEEN_ACTIONS);
  });

  // 👤 USER PROFILE & SESSION VALIDATION
  group('👤 User Profile & Session Management', function () {
    const profileRes = http.get(`${USER_SERVICE_URL}/api/users/me/profile`, {
      headers: authHeaders,
      tags: { endpoint: 'user_profile', flow: 'session_management' },
    });

    check(profileRes, {
      '👤 Profile Fetch Success': (r) => r.status === 200,
      '👤 Profile has user ID': (r) => r.json() && r.json().id,
    });

    sleep(SLEEP_QUICK_ACTION);
  });

  // Simulate natural user behavior with realistic delays
  sleep(SLEEP_BETWEEN_ACTIONS);
}

// 📊 TEARDOWN & REPORTING
export function handleSummary(data) {
  const summary = {
    testSuite: 'NightBFF Mobile App - Plan Functionality Performance Test',
    timestamp: new Date().toISOString(),
    testConfig: {
      virtualUsers: VUS,
      duration: DURATION,
      rampUp: RAMP_UP_TIME,
      rampDown: RAMP_DOWN_TIME,
    },
    performanceResults: {
      totalRequests: data.metrics.http_reqs.values.count,
      failedRequests: data.metrics.http_req_failed.values.count,
      errorRate: data.metrics.http_req_failed.values.rate,
      avgDuration: data.metrics.http_req_duration.values.avg,
      p95Duration: data.metrics.http_req_duration.values['p(95)'],
      p99Duration: data.metrics.http_req_duration.values['p(99)'],
    },
    businessMetrics: {
      planCreationSuccessRate: data.metrics.plan_creation_success_rate?.values.rate || 0,
      cityResolutionSuccessRate: data.metrics.city_resolution_success_rate?.values.rate || 0,
      cacheEffectiveness: data.metrics.cache_hit_effectiveness?.values.rate || 0,
      rpcCommunicationSuccess: data.metrics.rpc_communication_success?.values.rate || 0,
    },
  };

  console.log('\n📊 TEST SUMMARY - NightBFF Plan Functionality Performance');
  console.log('===========================================================');
  console.log(`🎯 Plan Creation Success Rate: ${(summary.businessMetrics.planCreationSuccessRate * 100).toFixed(1)}%`);
  console.log(`🏙️ City Resolution Success Rate: ${(summary.businessMetrics.cityResolutionSuccessRate * 100).toFixed(1)}%`);
  console.log(`⚡ Cache Effectiveness: ${(summary.businessMetrics.cacheEffectiveness * 100).toFixed(1)}%`);
  console.log(`🔗 RPC Communication Success: ${(summary.businessMetrics.rpcCommunicationSuccess * 100).toFixed(1)}%`);
  console.log(`📈 Overall P95 Duration: ${summary.performanceResults.p95Duration.toFixed(1)}ms`);
  console.log(`❌ Error Rate: ${(summary.performanceResults.errorRate * 100).toFixed(2)}%`);

  return {
    'summary.json': JSON.stringify(summary, null, 2),
  };
} 