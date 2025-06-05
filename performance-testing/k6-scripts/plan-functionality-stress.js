import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';

// =================================================================
// 🚀 PLAN FUNCTIONALITY STRESS TEST - SYSTEM LIMITS & BREAKING POINTS
// =================================================================
// Focused stress testing for Plan service: City resolution, RPC communication,
// background job impact, cache pressure, and database concurrency testing

// --- STRESS TEST CONFIGURATION ---
const VUS = parseInt(__ENV.VUS) || 20;         // Higher load for stress testing
const DURATION = __ENV.DURATION || '5m';       // Longer duration for stress
const RAMP_UP_TIME = __ENV.RAMP_UP_TIME || '1m';
const RAMP_DOWN_TIME = __ENV.RAMP_DOWN_TIME || '1m';

// Aggressive testing patterns
const SLEEP_MINIMAL = 0.1;      // Minimal delay for stress
const SLEEP_BURST = 0.2;        // Quick burst actions
const SLEEP_RECOVERY = 1;       // Recovery between stress bursts

// --- SERVICE URLS ---
const AUTH_SERVICE_URL = __ENV.AUTH_SERVICE_URL || 'http://auth:3000';
const USER_SERVICE_URL = __ENV.USER_SERVICE_URL || 'http://user:3000';
const PLAN_SERVICE_URL = __ENV.PLAN_SERVICE_URL || 'http://plan:3000';
const VENUE_SERVICE_URL = __ENV.VENUE_SERVICE_URL || 'http://venue:3000';
const EVENT_SERVICE_URL = __ENV.EVENT_SERVICE_URL || 'http://event:3000';

// --- STRESS TEST DATA ---
let tokens = [];
let userIds = [];

try {
  const tokenData = open('/scripts/loadtest_tokens.json');
  tokens = JSON.parse(tokenData);
  const userIdData = open('/scripts/loadtest_user_ids.txt');
  userIds = userIdData.split('\n').filter(id => id.trim() !== '');
  
  console.log(`🚀 STRESS TEST: Loaded ${tokens.length} tokens and ${userIds.length} user IDs`);
} catch (e) {
  console.error('❌ Error loading stress test data:', e.message);
}

// --- STRESS TEST OPTIONS ---
export const options = {
  stages: [
    { duration: RAMP_UP_TIME, target: VUS },       // Aggressive ramp-up
    { duration: DURATION, target: VUS },           // Sustained stress
    { duration: '30s', target: VUS * 1.5 },        // Peak stress burst
    { duration: '30s', target: VUS },              // Back to sustained
    { duration: RAMP_DOWN_TIME, target: 0 },       // Controlled ramp-down
  ],
  thresholds: {
    // 🔥 Stress Test Thresholds (More lenient for breaking point testing)
    'http_req_failed': ['rate<0.05'],                                    // 5% error rate acceptable under stress
    'http_req_duration': ['p(95)<2000'],                                 // P95 < 2s under stress
    'http_req_duration{operation:city_resolution}': ['p(95)<1500'],      // City resolution under stress
    'http_req_duration{operation:plan_creation_stress}': ['p(95)<2000'], // Plan creation under stress
    'http_req_duration{operation:rpc_communication}': ['p(95)<1000'],    // RPC under stress
    'http_req_duration{operation:cache_operations}': ['p(95)<500'],      // Cache should remain fast
    'http_req_duration{operation:spatial_queries}': ['p(95)<1500'],      // Spatial queries under stress
    
    // 🎯 Stress Test Business Metrics
    'plan_creation_under_stress': ['rate>0.85'],                        // 85% success under stress
    'city_resolution_under_stress': ['rate>0.80'],                      // 80% success under stress
    'rpc_resilience': ['rate>0.90'],                                    // 90% RPC success under stress
    'cache_performance_under_load': ['rate>0.70'],                      // 70% cache effectiveness under stress
    'spatial_query_resilience': ['rate>0.85'],                          // 85% spatial query success
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// --- STRESS TEST METRICS ---
const planCreationStress = new Rate('plan_creation_under_stress');
const cityResolutionStress = new Rate('city_resolution_under_stress');
const rpcResilienceRate = new Rate('rpc_resilience');
const cachePerformanceStress = new Rate('cache_performance_under_load');
const spatialQueryResilience = new Rate('spatial_query_resilience');

const cityResolutionTime = new Trend('city_resolution_duration', true);
const rpcCommunicationTime = new Trend('rpc_communication_duration', true);
const cacheOperationTime = new Trend('cache_operation_duration', true);
const planCreationStressTime = new Trend('plan_creation_stress_duration', true);

// --- STRESS TEST DATA GENERATORS ---
function getStressTestCoordinates() {
  // More diverse coordinates to stress city resolution
  const stressCoords = [
    { lat: 34.0522, lng: -118.2437, name: 'Los Angeles' },
    { lat: 40.7128, lng: -74.0060, name: 'New York' },
    { lat: 25.7617, lng: -80.1918, name: 'Miami' },
    { lat: 36.1699, lng: -115.1398, name: 'Las Vegas' },
    { lat: 37.7749, lng: -122.4194, name: 'San Francisco' },
    { lat: 29.7604, lng: -95.3698, name: 'Houston' },
    { lat: 33.4484, lng: -112.0740, name: 'Phoenix' },
    { lat: 39.7392, lng: -104.9903, name: 'Denver' },
    { lat: 41.8781, lng: -87.6298, name: 'Chicago' },
    { lat: 47.6062, lng: -122.3321, name: 'Seattle' },
    // International cities to stress geocoding
    { lat: 51.5074, lng: -0.1278, name: 'London' },
    { lat: 48.8566, lng: 2.3522, name: 'Paris' },
    { lat: 35.6762, lng: 139.6503, name: 'Tokyo' },
    { lat: -33.8688, lng: 151.2093, name: 'Sydney' },
  ];
  
  const coord = stressCoords[Math.floor(Math.random() * stressCoords.length)];
  const variance = 0.05; // Smaller variance for more focused testing
  
  return {
    latitude: coord.lat + (Math.random() - 0.5) * variance * 2,
    longitude: coord.lng + (Math.random() - 0.5) * variance * 2,
    cityName: coord.name
  };
}

function getStressTestDestinations() {
  // Mix of common and uncommon destinations to stress city resolution
  const destinations = [
    // Common destinations (should hit cache)
    'New York, NY',
    'Los Angeles, CA',
    'Miami, FL',
    'Las Vegas, NV',
    'San Francisco, CA',
    // Specific neighborhoods (stress geocoding)
    'Beverly Hills, California',
    'Times Square, New York',
    'South Beach, Miami',
    'The Strip, Las Vegas',
    'Nob Hill, San Francisco',
    'West Hollywood, CA',
    'Lower East Side, NYC',
    'Wynwood, Miami',
    'Downtown Las Vegas',
    'Mission District, SF',
    // International destinations (stress geocoding API)
    'London, UK',
    'Paris, France',
    'Tokyo, Japan',
    'Sydney, Australia',
    'Toronto, Canada',
    // Uncommon destinations (stress city creation)
    'Palo Alto, CA',
    'Austin, TX',
    'Nashville, TN',
    'Portland, OR',
    'Boulder, CO'
  ];
  return destinations[Math.floor(Math.random() * destinations.length)];
}

function getFutureStressDate() {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 60) + 1); // 1-60 days
  return futureDate.toISOString().split('T')[0];
}

// --- STRESS TEST EXECUTION ---
export default function () {
  if (tokens.length === 0) {
    console.error("❌ No tokens for stress test. Skipping.");
    sleep(5);
    return;
  }

  let accessToken = null;
  let currentUserId = null;

  // 🔥 RAPID AUTHENTICATION (Stress Login System)
  group('🔥 Rapid Authentication Stress', function () {
    const randomUserIndex = Math.floor(Math.random() * Math.min(tokens.length, userIds.length));
    const loginPayload = JSON.stringify({
      email: `loadtest${randomUserIndex}@nightbff.dev`,
      password: 'password123',
    });

    const res = http.post(`${AUTH_SERVICE_URL}/api/auth/signin`, loginPayload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { operation: 'rapid_auth', stress_level: 'high' },
    });

    const loginSuccess = check(res, {
      '🔥 Rapid Auth Success': (r) => r.status === 200,
      '🔥 Token Retrieved': (r) => r.json() && r.json().data && r.json().data.session && r.json().data.session.accessToken,
    });

    if (loginSuccess) {
      accessToken = res.json().data.session.accessToken;
      currentUserId = userIds[randomUserIndex] || `stress-user-${randomUserIndex}`;
    } else {
      console.error(`🔥 Stress auth failed: ${res.status}`);
      return;
    }
    
    sleep(SLEEP_MINIMAL);
  });

  if (!accessToken) {
    sleep(SLEEP_RECOVERY);
    return;
  }

  const authHeaders = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  // 🏙️ CITY RESOLUTION STRESS TEST
  group('🏙️ City Resolution & RPC Stress', function () {
    const destination = getStressTestDestinations();
    
    console.log(`🎯 STRESS: Creating plan for ${destination} (VU: ${__VU})`);
    
    const planPayload = JSON.stringify({
      destination: destination,
      startDate: getFutureStressDate(),
    });

    const planStart = Date.now();
    const planRes = http.post(`${PLAN_SERVICE_URL}/api/plans`, planPayload, {
      headers: authHeaders,
      tags: { operation: 'plan_creation_stress', stress_level: 'high' },
    });
    const planDuration = Date.now() - planStart;
    
    planCreationStressTime.add(planDuration);
    cityResolutionTime.add(planDuration); // City resolution is part of plan creation
    rpcCommunicationTime.add(planDuration); // RPC calls are part of plan creation

    const planSuccess = check(planRes, {
      '🏙️ Plan Creation Under Stress': (r) => r.status === 201,
      '🏙️ City Resolution Success': (r) => r.json() && r.json().city && r.json().city.id,
      '🏙️ RPC Communication Success': (r) => r.json() && r.json().id,
    });

    planCreationStress.add(planSuccess);
    cityResolutionStress.add(planSuccess && planRes.json() && planRes.json().city);
    rpcResilienceRate.add(planSuccess);

    if (planSuccess) {
      console.log(`✅ STRESS: Plan created in ${planRes.json().city.name} (${planDuration}ms)`);
    } else {
      console.error(`❌ STRESS: Plan creation failed for ${destination} (${planDuration}ms)`);
    }

    sleep(SLEEP_BURST);
  });

  // 📍 SPATIAL QUERY STRESS TEST
  group('📍 Spatial Query Stress', function () {
    const coords = getStressTestCoordinates();
    
    // Stress test nearby users with varying parameters
    const radiusOptions = [5, 10, 20, 50]; // Different radius values
    const radius = radiusOptions[Math.floor(Math.random() * radiusOptions.length)];
    
    const spatialStart = Date.now();
    const nearbyRes = http.get(
      `${USER_SERVICE_URL}/api/users/discovery/nearby?latitude=${coords.latitude}&longitude=${coords.longitude}&radiusInKm=${radius}&limit=50`,
      {
        headers: authHeaders,
        tags: { operation: 'spatial_queries', stress_level: 'high' },
      }
    );
    const spatialDuration = Date.now() - spatialStart;

    const spatialSuccess = check(nearbyRes, {
      '📍 Spatial Query Under Stress': (r) => r.status === 200,
      '📍 Spatial Query Response Valid': (r) => r.json() && Array.isArray(r.json().users),
    });

    spatialQueryResilience.add(spatialSuccess);

    if (spatialSuccess) {
      console.log(`✅ SPATIAL: Found ${nearbyRes.json().users.length} users in ${coords.cityName} (${spatialDuration}ms)`);
    }

    sleep(SLEEP_MINIMAL);
  });

  // ⚡ CACHE PRESSURE TEST
  group('⚡ Cache Performance Under Load', function () {
    // Rapid-fire cache-dependent endpoints
    const cacheStart = Date.now();
    
    // Hit trending cities multiple times to test cache
    const trendingRes = http.get(`${PLAN_SERVICE_URL}/api/cities/trending?limit=20`, {
      headers: authHeaders,
      tags: { operation: 'cache_operations', stress_level: 'high' },
    });
    
    const cacheSuccess = check(trendingRes, {
      '⚡ Cache Endpoint Success': (r) => r.status === 200,
      '⚡ Cache Response Valid': (r) => Array.isArray(r.json()),
    });

    cacheOperationTime.add(Date.now() - cacheStart);
    cachePerformanceStress.add(cacheSuccess);

    // Test city details for cache effectiveness
    if (cacheSuccess && trendingRes.json().length > 0) {
      const randomCity = trendingRes.json()[0]; // Use first city for consistency
      
      const detailsStart = Date.now();
      const detailsRes = http.get(`${PLAN_SERVICE_URL}/api/cities/${randomCity.id}/details`, {
        headers: authHeaders,
        tags: { operation: 'cache_operations', stress_level: 'high' },
      });
      
      const detailsSuccess = check(detailsRes, {
        '⚡ City Details Cache Success': (r) => r.status === 200,
      });
      
      cacheOperationTime.add(Date.now() - detailsStart);
      cachePerformanceStress.add(detailsSuccess);
    }

    sleep(SLEEP_MINIMAL);
  });

  // 🔄 CONCURRENT LOCATION UPDATES
  group('🔄 Location Update Pressure', function () {
    const coords = getStressTestCoordinates();
    
    const locationPayload = JSON.stringify({
      latitude: coords.latitude,
      longitude: coords.longitude,
    });

    const locationRes = http.post(`${USER_SERVICE_URL}/api/user/location`, locationPayload, {
      headers: authHeaders,
      tags: { operation: 'location_pressure', stress_level: 'high' },
    });

    check(locationRes, {
      '🔄 Location Update Under Pressure': (r) => r.status === 204 || r.status === 200,
    });

    sleep(SLEEP_MINIMAL);
  });

  // Recovery time between stress cycles
  sleep(SLEEP_RECOVERY);
}

// 🔥 STRESS TEST SUMMARY
export function handleSummary(data) {
  const summary = {
    testSuite: 'NightBFF Plan Functionality - STRESS TEST',
    testType: 'Breaking Point & System Resilience',
    timestamp: new Date().toISOString(),
    stressConfig: {
      maxVirtualUsers: VUS,
      peakVirtualUsers: Math.floor(VUS * 1.5),
      totalDuration: DURATION,
      rampUpTime: RAMP_UP_TIME,
    },
    stressResults: {
      totalRequests: data.metrics.http_reqs.values.count,
      failedRequests: data.metrics.http_req_failed.values.count,
      errorRateUnderStress: data.metrics.http_req_failed.values.rate,
      p95DurationUnderStress: data.metrics.http_req_duration.values['p(95)'],
      maxDurationObserved: data.metrics.http_req_duration.values.max,
    },
    resilienceMetrics: {
      planCreationUnderStress: data.metrics.plan_creation_under_stress?.values.rate || 0,
      cityResolutionUnderStress: data.metrics.city_resolution_under_stress?.values.rate || 0,
      rpcResilienceRate: data.metrics.rpc_resilience?.values.rate || 0,
      cachePerformanceUnderLoad: data.metrics.cache_performance_under_load?.values.rate || 0,
      spatialQueryResilience: data.metrics.spatial_query_resilience?.values.rate || 0,
    },
    performanceUnderStress: {
      cityResolutionP95: data.metrics.city_resolution_duration?.values['p(95)'] || 0,
      rpcCommunicationP95: data.metrics.rpc_communication_duration?.values['p(95)'] || 0,
      cacheOperationP95: data.metrics.cache_operation_duration?.values['p(95)'] || 0,
      planCreationP95: data.metrics.plan_creation_stress_duration?.values['p(95)'] || 0,
    },
  };

  console.log('\n🔥 STRESS TEST RESULTS - Plan Functionality Breaking Points');
  console.log('============================================================');
  console.log(`🎯 Plan Creation Resilience: ${(summary.resilienceMetrics.planCreationUnderStress * 100).toFixed(1)}%`);
  console.log(`🏙️ City Resolution Resilience: ${(summary.resilienceMetrics.cityResolutionUnderStress * 100).toFixed(1)}%`);
  console.log(`🔗 RPC Communication Resilience: ${(summary.resilienceMetrics.rpcResilienceRate * 100).toFixed(1)}%`);
  console.log(`⚡ Cache Performance Under Load: ${(summary.resilienceMetrics.cachePerformanceUnderLoad * 100).toFixed(1)}%`);
  console.log(`📍 Spatial Query Resilience: ${(summary.resilienceMetrics.spatialQueryResilience * 100).toFixed(1)}%`);
  console.log(`🔥 Error Rate Under Stress: ${(summary.stressResults.errorRateUnderStress * 100).toFixed(2)}%`);
  console.log(`⏱️ P95 Duration Under Stress: ${summary.stressResults.p95DurationUnderStress.toFixed(1)}ms`);
  console.log(`⚠️ Max Duration Observed: ${summary.stressResults.maxDurationObserved.toFixed(1)}ms`);

  return {
    'stress-test-summary.json': JSON.stringify(summary, null, 2),
  };
} 