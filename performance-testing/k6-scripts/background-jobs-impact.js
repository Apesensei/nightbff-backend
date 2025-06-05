import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';

// =================================================================
// ⚙️ BACKGROUND JOBS IMPACT TEST - SYSTEM PERFORMANCE UNDER LOAD
// =================================================================
// Tests how background operations (trending calculations, backfill jobs,
// async processing) impact user-facing API performance and system stability

// --- BACKGROUND JOBS TEST CONFIGURATION ---
const VUS = parseInt(__ENV.VUS) || 10;          // Moderate load to simulate real usage
const DURATION = __ENV.DURATION || '10m';       // Longer test to capture job cycles
const RAMP_UP_TIME = __ENV.RAMP_UP_TIME || '1m';
const RAMP_DOWN_TIME = __ENV.RAMP_DOWN_TIME || '1m';

// Background job simulation patterns
const SLEEP_USER_ACTION = 3;         // Normal user behavior
const SLEEP_QUICK_CHECK = 0.5;       // Quick status checks
const SLEEP_JOB_TRIGGER = 1;         // Between job triggers
const SLEEP_PERFORMANCE_CHECK = 2;   // Performance monitoring intervals

// --- SERVICE URLS ---
const AUTH_SERVICE_URL = __ENV.AUTH_SERVICE_URL || 'http://auth:3000';
const USER_SERVICE_URL = __ENV.USER_SERVICE_URL || 'http://user:3000';
const PLAN_SERVICE_URL = __ENV.PLAN_SERVICE_URL || 'http://plan:3000';
const VENUE_SERVICE_URL = __ENV.VENUE_SERVICE_URL || 'http://venue:3000';
const EVENT_SERVICE_URL = __ENV.EVENT_SERVICE_URL || 'http://event:3000';

// --- TEST DATA ---
let tokens = [];
let userIds = [];

try {
  const tokenData = open('/scripts/loadtest_tokens.json');
  tokens = JSON.parse(tokenData);
  const userIdData = open('/scripts/loadtest_user_ids.txt');
  userIds = userIdData.split('\n').filter(id => id.trim() !== '');
  
  console.log(`⚙️ BACKGROUND JOBS TEST: Loaded ${tokens.length} tokens and ${userIds.length} user IDs`);
} catch (e) {
  console.error('❌ Error loading background jobs test data:', e.message);
}

// --- TEST OPTIONS ---
export const options = {
  stages: [
    { duration: RAMP_UP_TIME, target: VUS },       // Gradual ramp-up
    { duration: '2m', target: VUS },               // Baseline performance
    { duration: '1m', target: VUS },               // Trigger background jobs
    { duration: '4m', target: VUS },               // Performance during jobs
    { duration: '2m', target: VUS },               // Recovery period
    { duration: RAMP_DOWN_TIME, target: 0 },       // Ramp-down
  ],
  thresholds: {
    // 📊 Performance Impact Monitoring
    'http_req_failed': ['rate<0.02'],                                           // 2% error rate during background jobs
    'http_req_duration': ['p(95)<1500'],                                        // Slightly higher threshold during jobs
    'http_req_duration{phase:baseline}': ['p(95)<800'],                         // Baseline performance
    'http_req_duration{phase:during_jobs}': ['p(95)<1500'],                     // Performance during background jobs
    'http_req_duration{phase:recovery}': ['p(95)<1000'],                        // Recovery performance
    
    // 🎯 Critical User Flows During Background Processing
    'http_req_duration{operation:plan_creation_with_jobs}': ['p(95)<2000'],     // Plan creation during jobs
    'http_req_duration{operation:trending_with_jobs}': ['p(95)<600'],           // Trending data during jobs
    'http_req_duration{operation:spatial_with_jobs}': ['p(95)<1000'],           // Spatial queries during jobs
    'http_req_duration{operation:cache_with_jobs}': ['p(95)<400'],              // Cache operations during jobs
    
    // 📈 System Resilience Metrics
    'user_experience_impact': ['rate<0.20'],                                    // < 20% performance degradation
    'background_job_success': ['rate>0.90'],                                    // 90% background job success
    'cache_effectiveness_during_jobs': ['rate>0.70'],                           // 70% cache effectiveness
    'rpc_stability_during_jobs': ['rate>0.95'],                                 // 95% RPC stability
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// --- BACKGROUND JOBS METRICS ---
const userExperienceImpact = new Rate('user_experience_impact');
const backgroundJobSuccess = new Rate('background_job_success');
const cacheEffectivenessDuringJobs = new Rate('cache_effectiveness_during_jobs');
const rpcStabilityDuringJobs = new Rate('rpc_stability_during_jobs');

const baselinePerformance = new Trend('baseline_performance_duration', true);
const jobsPerformance = new Trend('jobs_performance_duration', true);
const recoveryPerformance = new Trend('recovery_performance_duration', true);
const backgroundJobDuration = new Trend('background_job_duration', true);

// --- PHASE TRACKING ---
let currentPhase = 'startup';
let jobsTriggered = false;
let baselineMetrics = null;

// --- HELPER FUNCTIONS ---
function getRandomUser() {
  const index = Math.floor(Math.random() * Math.min(tokens.length, userIds.length));
  return {
    email: `loadtest${index}@nightbff.dev`,
    password: 'password123',
    userId: userIds[index] || `bg-user-${index}`
  };
}

function getJobTestCoordinates() {
  const coords = [
    { lat: 34.0522, lng: -118.2437, name: 'Los Angeles' },
    { lat: 40.7128, lng: -74.0060, name: 'New York' },
    { lat: 25.7617, lng: -80.1918, name: 'Miami' },
  ];
  const coord = coords[Math.floor(Math.random() * coords.length)];
  return {
    latitude: coord.lat + (Math.random() - 0.5) * 0.1,
    longitude: coord.lng + (Math.random() - 0.5) * 0.1,
    cityName: coord.name
  };
}

function getJobTestDestination() {
  const destinations = [
    'Beverly Hills, CA',
    'Manhattan, NY',
    'South Beach, Miami',
    'West Hollywood, CA',
    'Brooklyn, NY',
    'Coral Gables, FL'
  ];
  return destinations[Math.floor(Math.random() * destinations.length)];
}

function getCurrentPhase() {
  const elapsed = Date.now() - __ENV.TEST_START_TIME;
  const minutes = elapsed / (1000 * 60);
  
  if (minutes < 1) return 'startup';
  if (minutes < 3) return 'baseline';
  if (minutes < 4) return 'job_trigger';
  if (minutes < 8) return 'during_jobs';
  if (minutes < 10) return 'recovery';
  return 'rampdown';
}

// --- BACKGROUND JOB TRIGGERS ---
function triggerBackgroundJobs(authHeaders) {
  console.log('⚙️ TRIGGERING BACKGROUND JOBS - Testing system impact');
  
  // Trigger venue backfill (admin endpoint)
  const venueBackfillStart = Date.now();
  const venueBackfillRes = http.post(`${PLAN_SERVICE_URL}/api/admin/backfill/venues`, '{}', {
    headers: authHeaders,
    tags: { operation: 'venue_backfill', job_type: 'background' },
  });
  backgroundJobDuration.add(Date.now() - venueBackfillStart);
  
  const venueBackfillSuccess = check(venueBackfillRes, {
    '⚙️ Venue Backfill Triggered': (r) => r.status === 200 || r.status === 202,
  });
  backgroundJobSuccess.add(venueBackfillSuccess);
  
  sleep(SLEEP_JOB_TRIGGER);
  
  // Trigger event backfill (admin endpoint)
  const eventBackfillStart = Date.now();
  const eventBackfillRes = http.post(`${PLAN_SERVICE_URL}/api/admin/backfill/events`, '{}', {
    headers: authHeaders,
    tags: { operation: 'event_backfill', job_type: 'background' },
  });
  backgroundJobDuration.add(Date.now() - eventBackfillStart);
  
  const eventBackfillSuccess = check(eventBackfillRes, {
    '⚙️ Event Backfill Triggered': (r) => r.status === 200 || r.status === 202,
  });
  backgroundJobSuccess.add(eventBackfillSuccess);
  
  sleep(SLEEP_JOB_TRIGGER);
  
  // Create multiple plans to trigger city image fetching jobs
  for (let i = 0; i < 3; i++) {
    const planPayload = JSON.stringify({
      destination: getJobTestDestination(),
      startDate: new Date(Date.now() + (Math.random() * 30 + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    
    const planRes = http.post(`${PLAN_SERVICE_URL}/api/plans`, planPayload, {
      headers: authHeaders,
      tags: { operation: 'plan_creation_for_jobs', job_type: 'trigger' },
    });
    
    const planSuccess = check(planRes, {
      '⚙️ Plan Created (Job Trigger)': (r) => r.status === 201,
    });
    backgroundJobSuccess.add(planSuccess);
    
    sleep(SLEEP_JOB_TRIGGER);
  }
  
  console.log('✅ Background jobs triggered - Monitoring performance impact');
}

// --- PERFORMANCE MONITORING FUNCTIONS ---
function measureBaselinePerformance(authHeaders) {
  const start = Date.now();
  
  // Test critical user flows for baseline
  const trendingRes = http.get(`${PLAN_SERVICE_URL}/api/cities/trending?limit=5`, {
    headers: authHeaders,
    tags: { phase: 'baseline', operation: 'trending_baseline' },
  });
  
  const coords = getJobTestCoordinates();
  const nearbyRes = http.get(
    `${USER_SERVICE_URL}/api/users/discovery/nearby?latitude=${coords.latitude}&longitude=${coords.longitude}&radiusInKm=10&limit=10`,
    {
      headers: authHeaders,
      tags: { phase: 'baseline', operation: 'spatial_baseline' },
    }
  );
  
  const duration = Date.now() - start;
  baselinePerformance.add(duration);
  
  return {
    trendingSuccess: trendingRes.status === 200,
    nearbySuccess: nearbyRes.status === 200,
    totalDuration: duration
  };
}

function measureJobsPerformance(authHeaders) {
  const start = Date.now();
  
  // Test same operations during background jobs
  const trendingRes = http.get(`${PLAN_SERVICE_URL}/api/cities/trending?limit=5`, {
    headers: authHeaders,
    tags: { phase: 'during_jobs', operation: 'trending_with_jobs' },
  });
  
  const coords = getJobTestCoordinates();
  const nearbyRes = http.get(
    `${USER_SERVICE_URL}/api/users/discovery/nearby?latitude=${coords.latitude}&longitude=${coords.longitude}&radiusInKm=10&limit=10`,
    {
      headers: authHeaders,
      tags: { phase: 'during_jobs', operation: 'spatial_with_jobs' },
    }
  );
  
  // Test plan creation during background jobs
  const planPayload = JSON.stringify({
    destination: getJobTestDestination(),
    startDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });
  
  const planRes = http.post(`${PLAN_SERVICE_URL}/api/plans`, planPayload, {
    headers: authHeaders,
    tags: { phase: 'during_jobs', operation: 'plan_creation_with_jobs' },
  });
  
  const duration = Date.now() - start;
  jobsPerformance.add(duration);
  
  const success = trendingRes.status === 200 && nearbyRes.status === 200 && planRes.status === 201;
  
  // Check cache effectiveness
  const cacheHeader = trendingRes.headers['X-Cache'] || trendingRes.headers['x-cache'];
  cacheEffectivenessDuringJobs.add(cacheHeader === 'HIT');
  
  // Check RPC stability
  rpcStabilityDuringJobs.add(planRes.status === 201);
  
  return {
    success: success,
    totalDuration: duration,
    planCreated: planRes.status === 201
  };
}

function measureRecoveryPerformance(authHeaders) {
  const start = Date.now();
  
  // Test recovery performance
  const trendingRes = http.get(`${PLAN_SERVICE_URL}/api/cities/trending?limit=5`, {
    headers: authHeaders,
    tags: { phase: 'recovery', operation: 'trending_recovery' },
  });
  
  const coords = getJobTestCoordinates();
  const nearbyRes = http.get(
    `${USER_SERVICE_URL}/api/users/discovery/nearby?latitude=${coords.latitude}&longitude=${coords.longitude}&radiusInKm=10&limit=10`,
    {
      headers: authHeaders,
      tags: { phase: 'recovery', operation: 'spatial_recovery' },
    }
  );
  
  const duration = Date.now() - start;
  recoveryPerformance.add(duration);
  
  return {
    success: trendingRes.status === 200 && nearbyRes.status === 200,
    totalDuration: duration
  };
}

// --- MAIN TEST EXECUTION ---
export default function () {
  if (tokens.length === 0) {
    console.error("❌ No tokens for background jobs test. Skipping.");
    sleep(5);
    return;
  }

  const phase = getCurrentPhase();
  currentPhase = phase;

  let accessToken = null;
  let currentUserId = null;

  // 🔐 AUTHENTICATION
  group('🔐 Background Jobs Test Authentication', function () {
    const user = getRandomUser();
    const loginPayload = JSON.stringify({
      email: user.email,
      password: user.password,
    });

    const res = http.post(`${AUTH_SERVICE_URL}/api/auth/signin`, loginPayload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { phase: phase, operation: 'auth' },
    });

    const loginSuccess = check(res, {
      '🔐 Background Jobs Auth Success': (r) => r.status === 200,
      '🔐 Token Retrieved': (r) => r.json() && r.json().data && r.json().data.session && r.json().data.session.accessToken,
    });

    if (loginSuccess) {
      accessToken = res.json().data.session.accessToken;
      currentUserId = user.userId;
    } else {
      console.error(`🔐 Background jobs auth failed: ${res.status}`);
      return;
    }
    
    sleep(SLEEP_QUICK_CHECK);
  });

  if (!accessToken) {
    sleep(SLEEP_USER_ACTION);
    return;
  }

  const authHeaders = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  // 📊 PHASE-SPECIFIC TESTING
  switch (phase) {
    case 'baseline':
      group('📊 Baseline Performance Measurement', function () {
        const baseline = measureBaselinePerformance(authHeaders);
        baselineMetrics = baseline;
        console.log(`📊 BASELINE: Duration ${baseline.totalDuration}ms`);
        sleep(SLEEP_PERFORMANCE_CHECK);
      });
      break;

    case 'job_trigger':
      if (__VU === 1 && !jobsTriggered) { // Only VU 1 triggers jobs once
        group('⚙️ Background Jobs Trigger', function () {
          triggerBackgroundJobs(authHeaders);
          jobsTriggered = true;
        });
      } else {
        // Other VUs continue normal testing
        group('👤 Normal User Activity (Job Trigger Phase)', function () {
          measureBaselinePerformance(authHeaders);
          sleep(SLEEP_USER_ACTION);
        });
      }
      break;

    case 'during_jobs':
      group('⚙️ Performance During Background Jobs', function () {
        const jobsMetrics = measureJobsPerformance(authHeaders);
        
        // Calculate performance impact
        if (baselineMetrics && baselineMetrics.totalDuration > 0) {
          const impactRatio = jobsMetrics.totalDuration / baselineMetrics.totalDuration;
          const significantImpact = impactRatio > 1.5; // > 50% degradation
          userExperienceImpact.add(significantImpact);
          
          if (significantImpact) {
            console.log(`⚠️ PERFORMANCE IMPACT: ${((impactRatio - 1) * 100).toFixed(1)}% degradation`);
          }
        }
        
        console.log(`⚙️ DURING JOBS: Duration ${jobsMetrics.totalDuration}ms, Plan Created: ${jobsMetrics.planCreated}`);
        sleep(SLEEP_PERFORMANCE_CHECK);
      });
      break;

    case 'recovery':
      group('🔄 Recovery Performance Measurement', function () {
        const recovery = measureRecoveryPerformance(authHeaders);
        console.log(`🔄 RECOVERY: Duration ${recovery.totalDuration}ms`);
        sleep(SLEEP_PERFORMANCE_CHECK);
      });
      break;

    default:
      // Normal user activity during startup/rampdown
      group('👤 Normal User Activity', function () {
        measureBaselinePerformance(authHeaders);
        sleep(SLEEP_USER_ACTION);
      });
  }
}

// 📊 BACKGROUND JOBS IMPACT SUMMARY
export function handleSummary(data) {
  const summary = {
    testSuite: 'NightBFF Plan Functionality - Background Jobs Impact Test',
    testType: 'System Performance Under Background Load',
    timestamp: new Date().toISOString(),
    testConfig: {
      virtualUsers: VUS,
      totalDuration: DURATION,
      backgroundJobsTriggered: jobsTriggered,
    },
    performancePhases: {
      baseline: {
        p95Duration: data.metrics['http_req_duration{phase:baseline}']?.values['p(95)'] || 0,
        avgDuration: data.metrics.baseline_performance_duration?.values.avg || 0,
      },
      duringJobs: {
        p95Duration: data.metrics['http_req_duration{phase:during_jobs}']?.values['p(95)'] || 0,
        avgDuration: data.metrics.jobs_performance_duration?.values.avg || 0,
      },
      recovery: {
        p95Duration: data.metrics['http_req_duration{phase:recovery}']?.values['p(95)'] || 0,
        avgDuration: data.metrics.recovery_performance_duration?.values.avg || 0,
      },
    },
    impactMetrics: {
      userExperienceImpactRate: data.metrics.user_experience_impact?.values.rate || 0,
      backgroundJobSuccessRate: data.metrics.background_job_success?.values.rate || 0,
      cacheEffectivenessDuringJobs: data.metrics.cache_effectiveness_during_jobs?.values.rate || 0,
      rpcStabilityDuringJobs: data.metrics.rpc_stability_during_jobs?.values.rate || 0,
    },
    systemResilience: {
      overallErrorRate: data.metrics.http_req_failed.values.rate,
      totalRequests: data.metrics.http_reqs.values.count,
      failedRequests: data.metrics.http_req_failed.values.count,
    },
  };

  // Calculate performance degradation
  const baselineP95 = summary.performancePhases.baseline.p95Duration;
  const jobsP95 = summary.performancePhases.duringJobs.p95Duration;
  const performanceDegradation = baselineP95 > 0 ? ((jobsP95 - baselineP95) / baselineP95) * 100 : 0;

  console.log('\n⚙️ BACKGROUND JOBS IMPACT ANALYSIS');
  console.log('==========================================');
  console.log(`📊 Baseline P95: ${baselineP95.toFixed(1)}ms`);
  console.log(`⚙️ During Jobs P95: ${jobsP95.toFixed(1)}ms`);
  console.log(`📈 Performance Degradation: ${performanceDegradation.toFixed(1)}%`);
  console.log(`👤 User Experience Impact Rate: ${(summary.impactMetrics.userExperienceImpactRate * 100).toFixed(1)}%`);
  console.log(`⚙️ Background Job Success Rate: ${(summary.impactMetrics.backgroundJobSuccessRate * 100).toFixed(1)}%`);
  console.log(`⚡ Cache Effectiveness During Jobs: ${(summary.impactMetrics.cacheEffectivenessDuringJobs * 100).toFixed(1)}%`);
  console.log(`🔗 RPC Stability During Jobs: ${(summary.impactMetrics.rpcStabilityDuringJobs * 100).toFixed(1)}%`);
  console.log(`❌ Overall Error Rate: ${(summary.systemResilience.overallErrorRate * 100).toFixed(2)}%`);

  return {
    'background-jobs-impact.json': JSON.stringify(summary, null, 2),
  };
} 