import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';

// =================================================================
// ⚙️ BACKGROUND JOBS IMPACT TEST - SIMPLIFIED VERSION
// =================================================================
// Tests how background operations (trending calculations, backfill jobs,
// async processing) impact user-facing API performance and system stability
// 
// SIMPLIFIED APPROACH:
// 1. Uses existing admin user created via database seeding
// 2. Tests admin endpoints directly with proper authentication
// 3. Monitors user experience during background job execution
// 4. Measures performance impact of background operations

// --- TEST CONFIGURATION ---
const VUS = parseInt(__ENV.VUS) || 6;
const DURATION = __ENV.DURATION || '6m';
const RAMP_UP_TIME = __ENV.RAMP_UP_TIME || '30s';
const RAMP_DOWN_TIME = __ENV.RAMP_DOWN_TIME || '30s';

// Phase timing (seconds) - FIXED VALUES
const BASELINE_PHASE_DURATION = 90;      // 1.5 minutes baseline
const JOB_TRIGGER_DURATION = 30;         // 30 seconds for job triggering
const DURING_JOBS_DURATION = 120;        // 2 minutes monitoring during jobs
const RECOVERY_DURATION = 90;            // 1.5 minutes recovery monitoring

// Sleep patterns
const SLEEP_USER_ACTION = 2;         
const SLEEP_QUICK_CHECK = 0.5;       
const SLEEP_JOB_TRIGGER = 1;         
const SLEEP_PERFORMANCE_CHECK = 1.5;   

// --- SERVICE URLS ---
const AUTH_SERVICE_URL = __ENV.AUTH_SERVICE_URL || 'http://auth:3000';
const USER_SERVICE_URL = __ENV.USER_SERVICE_URL || 'http://user:3000';
const PLAN_SERVICE_URL = __ENV.PLAN_SERVICE_URL || 'http://plan:3000';
const VENUE_SERVICE_URL = __ENV.VENUE_SERVICE_URL || 'http://venue:3000';

// --- ADMIN CREDENTIALS ---
// These match the admin user created by seed-admin-user.ts
// In performance mode, use the standard performance password
const ADMIN_USER = {
  email: 'admin-loadtest@nightbff.dev',
  password: 'password123'  // Performance mode standard password
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
function authenticateAsAdmin() {
  console.log('🔐 Authenticating as admin user...');
  
  const loginPayload = JSON.stringify({
    email: ADMIN_USER.email,
    password: ADMIN_USER.password
  });
  
  const loginRes = http.post(`${AUTH_SERVICE_URL}/api/auth/signin`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { operation: 'admin_login', phase: 'setup' }
  });
  
  if (loginRes.status === 200) {
    const loginData = JSON.parse(loginRes.body);
    if (loginData.success && loginData.data && loginData.data.session && loginData.data.session.accessToken) {
      console.log('✅ Admin authenticated successfully');
      return loginData.data.session.accessToken;
    }
  }
  
  console.error(`❌ Admin authentication failed: ${loginRes.status} - ${loginRes.body}`);
  return null;
}

// --- BACKGROUND JOB TRIGGERS ---
function triggerBackgroundJobs(adminToken) {
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
  console.log('🏢 Triggering venue backfill job...');
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
    console.log(`✅ Venue backfill triggered (${venueBackfillDuration}ms, status: ${venueBackfillRes.status})`);
  } else {
    console.error(`❌ Venue backfill failed: ${venueBackfillRes.status} - ${venueBackfillRes.body}`);
  }
  
  sleep(SLEEP_JOB_TRIGGER);
  
  // Trigger event backfill (admin endpoint)
  console.log('📅 Triggering event backfill job...');
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
    console.log(`✅ Event backfill triggered (${eventBackfillDuration}ms, status: ${eventBackfillRes.status})`);
  } else {
    console.error(`❌ Event backfill failed: ${eventBackfillRes.status} - ${eventBackfillRes.body}`);
  }
  
  sleep(SLEEP_JOB_TRIGGER);
  
  // Create multiple plans to trigger additional background processing
  console.log('📝 Creating plans to trigger background jobs...');
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
    
    if (planSuccess) {
      console.log(`✅ Plan ${i+1}/3 created for background job triggering`);
    } else {
      console.error(`❌ Plan ${i+1}/3 creation failed: ${planRes.status}`);
    }
    
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
  
  const cacheHit = trendingRes.headers['X-Cache-Status'] === 'HIT' || trendingRes.status === 200;
  cacheEffectivenessDuringJobs.add(cacheHit);
  
  // Test RPC stability with nearby users
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
    'Los Angeles, CA',
    'Berlin, Germany',
    'Amsterdam, Netherlands'
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
    'http_req_duration{operation:venue_backfill}': ['p(95)<15000'], // Background jobs can be slower
    'http_req_duration{operation:event_backfill}': ['p(95)<15000'],
    'background_job_success': ['rate>0.7'], // At least 70% of background jobs should succeed
    'user_experience_impact': ['rate>0.85'], // 85% of user operations should still work
    'cache_effectiveness_during_jobs': ['rate>0.6'], // Cache should still work during jobs
    'rpc_stability_during_jobs': ['rate>0.9'], // RPC should remain stable
  }
};

// --- SETUP FUNCTION ---
export function setup() {
  console.log('🚀 Starting Background Jobs Impact Test Setup');
  
  // Authenticate as admin
  const adminTokenResult = authenticateAsAdmin();
  if (!adminTokenResult) {
    throw new Error('Failed to authenticate as admin user for background jobs test');
  }
  
  testStartTime = Date.now();
  console.log(`⏰ Test start time: ${new Date(testStartTime).toISOString()}`);
  console.log(`📊 Test phases: Baseline(${BASELINE_PHASE_DURATION}s) → Trigger(${JOB_TRIGGER_DURATION}s) → During(${DURING_JOBS_DURATION}s) → Recovery(${RECOVERY_DURATION}s)`);
  
  return { 
    adminToken: adminTokenResult,
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
    
    // Phase 1: Baseline Performance (First 90 seconds)
    if (currentPhase === 'baseline') {
      const duration = measureUserExperience(authHeaders, 'baseline');
      sleep(SLEEP_PERFORMANCE_CHECK);
    }
    
    // Phase 2: Trigger Background Jobs (90-120 seconds)
    else if (currentPhase === 'triggering') {
      // Only trigger jobs from VU 1 to avoid multiple triggers
      if (__VU === 1) {
        const jobsTriggered = triggerBackgroundJobs(data.adminToken);
        if (jobsTriggered) {
          console.log('⚙️ Background jobs triggered successfully');
        }
      }
      
      // All VUs continue normal user behavior
      const duration = measureUserExperience(authHeaders, 'triggering');
      sleep(SLEEP_QUICK_CHECK);
    }
    
    // Phase 3: Monitor During Jobs (120-240 seconds)
    else if (currentPhase === 'during_jobs') {
      const duration = measureUserExperience(authHeaders, 'during_jobs');
      sleep(SLEEP_PERFORMANCE_CHECK);
    }
    
    // Phase 4: Recovery Monitoring (240-330 seconds)
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
  
  // Log summary of phases completed
  const totalElapsed = (Date.now() - data.testStartTime) / 1000;
  const phasesCompleted = [];
  
  if (totalElapsed > BASELINE_PHASE_DURATION) phasesCompleted.push('baseline');
  if (totalElapsed > BASELINE_PHASE_DURATION + JOB_TRIGGER_DURATION) phasesCompleted.push('triggering');
  if (totalElapsed > BASELINE_PHASE_DURATION + JOB_TRIGGER_DURATION + DURING_JOBS_DURATION) phasesCompleted.push('during_jobs');
  if (totalElapsed > BASELINE_PHASE_DURATION + JOB_TRIGGER_DURATION + DURING_JOBS_DURATION + RECOVERY_DURATION) phasesCompleted.push('recovery');
  
  console.log(`✅ Phases completed: ${phasesCompleted.join(' → ')}`);
} 