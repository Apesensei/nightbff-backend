import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';

// =================================================================
// ⚙️ BACKGROUND JOBS IMPACT TEST - FIXED VERSION
// =================================================================
// Tests how background operations (trending calculations, backfill jobs,
// async processing) impact user-facing API performance and system stability
// 
// FIXES APPLIED:
// 1. Creates admin user for proper authentication
// 2. Uses correct admin endpoints with proper auth
// 3. Fixed phase timing and metrics collection
// 4. Improved error handling and diagnostics

// --- TEST CONFIGURATION ---
const VUS = parseInt(__ENV.VUS) || 8;
const DURATION = __ENV.DURATION || '8m';
const RAMP_UP_TIME = __ENV.RAMP_UP_TIME || '1m';
const RAMP_DOWN_TIME = __ENV.RAMP_DOWN_TIME || '1m';

// Phase timing (seconds) - FIXED VALUES
const BASELINE_PHASE_DURATION = 120;     // 2 minutes baseline
const JOB_TRIGGER_DURATION = 30;         // 30 seconds for job triggering
const DURING_JOBS_DURATION = 180;        // 3 minutes monitoring during jobs
const RECOVERY_DURATION = 90;            // 1.5 minutes recovery monitoring

// Sleep patterns
const SLEEP_USER_ACTION = 3;         
const SLEEP_QUICK_CHECK = 0.5;       
const SLEEP_JOB_TRIGGER = 1;         
const SLEEP_PERFORMANCE_CHECK = 2;   

// --- SERVICE URLS ---
const AUTH_SERVICE_URL = __ENV.AUTH_SERVICE_URL || 'http://auth:3000';
const USER_SERVICE_URL = __ENV.USER_SERVICE_URL || 'http://user:3000';
const PLAN_SERVICE_URL = __ENV.PLAN_SERVICE_URL || 'http://plan:3000';
const VENUE_SERVICE_URL = __ENV.VENUE_SERVICE_URL || 'http://venue:3000';

// --- ADMIN USER CREATION ---
// We need to create an admin user for testing background jobs
const ADMIN_USER = {
  email: 'admin-loadtest@nightbff.dev',
  username: 'admin_loadtest',
  displayName: 'Admin Load Test User',
  password: 'AdminPassword123!'
};

// --- TEST METRICS ---
const backgroundJobDuration = new Trend('background_job_duration');
const backgroundJobSuccess = new Rate('background_job_success');
const userExperienceImpact = new Rate('user_experience_impact');
const cacheEffectivenessDuringJobs = new Rate('cache_effectiveness_during_jobs');
const rpcStabilityDuringJobs = new Rate('rpc_stability_during_jobs');
const performanceDegradation = new Trend('performance_degradation_percent');

// Phase-specific metrics
const baselinePerformance = new Trend('baseline_performance');
const duringJobsPerformance = new Trend('during_jobs_performance');
const recoveryPerformance = new Trend('recovery_performance');

// --- TEST DATA ---
let tokens = [];
let userIds = [];
let adminToken = '';

try {
  const tokenData = open('/scripts/loadtest_tokens.json');
  tokens = JSON.parse(tokenData);
  const userIdData = open('/scripts/loadtest_user_ids.txt');
  userIds = userIdData.split('\n').filter(id => id.trim() !== '');
  
  console.log(`⚙️ BACKGROUND JOBS TEST: Loaded ${tokens.length} tokens and ${userIds.length} user IDs`);
} catch (e) {
  console.error('❌ Error loading test data:', e.message);
}

// --- PHASE MANAGEMENT ---
let testStartTime = null;

function getCurrentPhase() {
  if (!testStartTime) return 'unknown';
  
  const elapsed = (Date.now() - testStartTime) / 1000;
  
  if (elapsed <= BASELINE_PHASE_DURATION) return 'baseline';
  if (elapsed <= BASELINE_PHASE_DURATION + JOB_TRIGGER_DURATION) return 'triggering';
  if (elapsed <= BASELINE_PHASE_DURATION + JOB_TRIGGER_DURATION + DURING_JOBS_DURATION) return 'during_jobs';
  return 'recovery';
}

// --- ADMIN AUTHENTICATION ---
function createAdminUser() {
  console.log('🔐 Creating admin user for background jobs test...');
  
  const adminPayload = JSON.stringify({
    email: ADMIN_USER.email,
    username: ADMIN_USER.username,
    displayName: ADMIN_USER.displayName,
    password: ADMIN_USER.password,
    roles: ['ADMIN'],  // Explicitly set admin role
    isVerified: true,
    isAgeVerified: true
  });
  
  const adminCreateRes = http.post(`${AUTH_SERVICE_URL}/api/auth/register`, adminPayload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { operation: 'admin_user_creation', phase: 'setup' }
  });
  
  if (adminCreateRes.status === 201 || adminCreateRes.status === 409) { // 409 = already exists
    console.log('✅ Admin user created or already exists');
    
    // Login as admin
    const loginPayload = JSON.stringify({
      email: ADMIN_USER.email,
      password: ADMIN_USER.password
    });
    
    const loginRes = http.post(`${AUTH_SERVICE_URL}/api/auth/login`, loginPayload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { operation: 'admin_login', phase: 'setup' }
    });
    
    if (loginRes.status === 200) {
      const loginData = JSON.parse(loginRes.body);
      adminToken = loginData.accessToken;
      console.log('✅ Admin authenticated successfully');
      return true;
    }
  }
  
  console.error('❌ Failed to create/authenticate admin user');
  return false;
}

// --- BACKGROUND JOB TRIGGERS ---
function triggerBackgroundJobs() {
  if (!adminToken) {
    console.error('❌ No admin token available for job triggering');
    return false;
  }
  
  console.log('⚙️ TRIGGERING BACKGROUND JOBS - Testing system impact');
  
  const adminHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  };
  
  let jobsTriggered = 0;
  
  // Trigger venue backfill (admin endpoint)
  const venueBackfillStart = Date.now();
  const venueBackfillRes = http.post(`${PLAN_SERVICE_URL}/api/admin/backfill/venues`, '{}', {
    headers: adminHeaders,
    tags: { operation: 'venue_backfill', job_type: 'background' },
  });
  const venueBackfillDuration = Date.now() - venueBackfillStart;
  backgroundJobDuration.add(venueBackfillDuration);
  
  const venueBackfillSuccess = check(venueBackfillRes, {
    '⚙️ Venue Backfill Triggered': (r) => r.status === 200 || r.status === 202,
  });
  backgroundJobSuccess.add(venueBackfillSuccess);
  
  if (venueBackfillSuccess) {
    jobsTriggered++;
    console.log(`✅ Venue backfill triggered (${venueBackfillDuration}ms)`);
  } else {
    console.error(`❌ Venue backfill failed: ${venueBackfillRes.status} - ${venueBackfillRes.body}`);
  }
  
  sleep(SLEEP_JOB_TRIGGER);
  
  // Trigger event backfill (admin endpoint)
  const eventBackfillStart = Date.now();
  const eventBackfillRes = http.post(`${PLAN_SERVICE_URL}/api/admin/backfill/events`, '{}', {
    headers: adminHeaders,
    tags: { operation: 'event_backfill', job_type: 'background' },
  });
  const eventBackfillDuration = Date.now() - eventBackfillStart;
  backgroundJobDuration.add(eventBackfillDuration);
  
  const eventBackfillSuccess = check(eventBackfillRes, {
    '⚙️ Event Backfill Triggered': (r) => r.status === 200 || r.status === 202,
  });
  backgroundJobSuccess.add(eventBackfillSuccess);
  
  if (eventBackfillSuccess) {
    jobsTriggered++;
    console.log(`✅ Event backfill triggered (${eventBackfillDuration}ms)`);
  } else {
    console.error(`❌ Event backfill failed: ${eventBackfillRes.status} - ${eventBackfillRes.body}`);
  }
  
  sleep(SLEEP_JOB_TRIGGER);
  
  // Create multiple plans to trigger city image fetching jobs
  for (let i = 0; i < 3; i++) {
    const planPayload = JSON.stringify({
      destination: getJobTestDestination(),
      startDate: new Date(Date.now() + (Math.random() * 30 + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    
    const planRes = http.post(`${PLAN_SERVICE_URL}/api/plans`, planPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getRandomToken()}`
      },
      tags: { operation: 'plan_creation_for_jobs', job_type: 'trigger' },
    });
    
    const planSuccess = check(planRes, {
      '⚙️ Plan Created (Job Trigger)': (r) => r.status === 201,
    });
    backgroundJobSuccess.add(planSuccess);
    
    sleep(SLEEP_JOB_TRIGGER);
  }
  
  console.log(`⚙️ Background jobs triggered: ${jobsTriggered}/2 admin jobs + 3 plan jobs`);
  return jobsTriggered > 0;
}

// --- PERFORMANCE MONITORING ---
function measureUserExperience(authHeaders, phase) {
  const start = Date.now();
  
  // Test core user functionality during background jobs
  const planRes = http.post(`${PLAN_SERVICE_URL}/api/plans`, JSON.stringify({
    destination: 'San Francisco, CA',
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  }), {
    headers: authHeaders,
    tags: { operation: 'plan_creation', phase: phase }
  });
  
  const duration = Date.now() - start;
  
  // Record phase-specific performance
  switch(phase) {
    case 'baseline':
      baselinePerformance.add(duration);
      break;
    case 'during_jobs':
      duringJobsPerformance.add(duration);
      break;
    case 'recovery':
      recoveryPerformance.add(duration);
      break;
  }
  
  const planSuccess = check(planRes, {
    '📱 Plan Creation During Jobs': (r) => r.status === 201,
  });
  
  userExperienceImpact.add(planSuccess);
  
  // Test cache effectiveness
  const trendingRes = http.get(`${PLAN_SERVICE_URL}/api/plans/trending-cities`, {
    headers: authHeaders,
    tags: { operation: 'trending_cities', phase: phase }
  });
  
  const cacheHit = trendingRes.headers['X-Cache-Status'] === 'HIT';
  cacheEffectivenessDuringJobs.add(cacheHit);
  
  // Test RPC stability
  const nearbyRes = http.get(`${USER_SERVICE_URL}/api/users/nearby?latitude=37.7749&longitude=-122.4194&radius=5000`, {
    headers: authHeaders,
    tags: { operation: 'nearby_users', phase: phase }
  });
  
  const rpcSuccess = check(nearbyRes, {
    '🔗 RPC Communication Stable': (r) => r.status === 200,
  });
  rpcStabilityDuringJobs.add(rpcSuccess);
  
  return duration;
}

// --- HELPER FUNCTIONS ---
function getRandomToken() {
  return tokens[Math.floor(Math.random() * tokens.length)];
}

function getRandomUserId() {
  return userIds[Math.floor(Math.random() * userIds.length)];
}

function getJobTestDestination() {
  const destinations = [
    'Tokyo, Japan',
    'London, UK', 
    'Paris, France',
    'Sydney, Australia',
    'New York, NY',
    'Los Angeles, CA'
  ];
  return destinations[Math.floor(Math.random() * destinations.length)];
}

// --- K6 OPTIONS ---
export let options = {
  stages: [
    { duration: RAMP_UP_TIME, target: VUS },
    { duration: DURATION, target: VUS },
    { duration: RAMP_DOWN_TIME, target: 0 },
  ],
  thresholds: {
    'http_req_duration{operation:plan_creation}': ['p(95)<2000'], // More lenient during background jobs
    'http_req_duration{operation:venue_backfill}': ['p(95)<10000'], // Background jobs can be slower
    'http_req_duration{operation:event_backfill}': ['p(95)<10000'],
    'background_job_success': ['rate>0.8'], // At least 80% of background jobs should succeed
    'user_experience_impact': ['rate>0.9'], // 90% of user operations should still work
    'cache_effectiveness_during_jobs': ['rate>0.6'], // Cache should still work during jobs
    'rpc_stability_during_jobs': ['rate>0.95'], // RPC should remain stable
  }
};

// --- SETUP FUNCTION ---
export function setup() {
  console.log('🚀 Starting Background Jobs Impact Test Setup');
  
  // Verify admin user creation
  const adminReady = createAdminUser();
  if (!adminReady) {
    throw new Error('Failed to setup admin user for background jobs test');
  }
  
  testStartTime = Date.now();
  console.log(`⏰ Test start time: ${new Date(testStartTime).toISOString()}`);
  
  return { 
    adminToken,
    testStartTime,
    totalUsers: tokens.length 
  };
}

// --- MAIN TEST FUNCTION ---
export default function(data) {
  if (!tokens.length) {
    console.error('❌ No tokens available for testing');
    return;
  }
  
  const currentToken = getRandomToken();
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${currentToken}`
  };
  
  const currentPhase = getCurrentPhase();
  
  group(`Background Jobs Impact - ${currentPhase.toUpperCase()} Phase`, function() {
    
    // Phase 1: Baseline Performance (First 2 minutes)
    if (currentPhase === 'baseline') {
      const duration = measureUserExperience(authHeaders, 'baseline');
      sleep(SLEEP_PERFORMANCE_CHECK);
    }
    
    // Phase 2: Trigger Background Jobs (2-2.5 minutes)
    else if (currentPhase === 'triggering') {
      // Only trigger jobs from VU 1 to avoid multiple triggers
      if (__VU === 1) {
        const jobsTriggered = triggerBackgroundJobs();
        if (jobsTriggered) {
          console.log('⚙️ Background jobs triggered successfully');
        }
      }
      
      // All VUs continue normal user behavior
      const duration = measureUserExperience(authHeaders, 'triggering');
      sleep(SLEEP_QUICK_CHECK);
    }
    
    // Phase 3: Monitor During Jobs (2.5-5.5 minutes)
    else if (currentPhase === 'during_jobs') {
      const duration = measureUserExperience(authHeaders, 'during_jobs');
      
      // Calculate performance degradation
      if (data.baselineAvg && duration > data.baselineAvg) {
        const degradation = ((duration - data.baselineAvg) / data.baselineAvg) * 100;
        performanceDegradation.add(degradation);
      }
      
      sleep(SLEEP_PERFORMANCE_CHECK);
    }
    
    // Phase 4: Recovery Monitoring (5.5-7 minutes)
    else if (currentPhase === 'recovery') {
      const duration = measureUserExperience(authHeaders, 'recovery');
      sleep(SLEEP_PERFORMANCE_CHECK);
    }
  });
}

// --- TEARDOWN FUNCTION ---
export function teardown(data) {
  console.log('🧹 Background Jobs Impact Test Teardown');
  console.log(`⏰ Test completed at: ${new Date().toISOString()}`);
  console.log(`📊 Total test duration: ${((Date.now() - data.testStartTime) / 1000).toFixed(2)} seconds`);
} 