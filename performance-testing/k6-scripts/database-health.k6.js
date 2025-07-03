import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Gauge, Rate } from 'k6/metrics';

// =================================================================
// 🩺 DATABASE HEALTH MONITOR - CONNECTION GUARDRAIL
// =================================================================
// This script acts as a health probe, NOT a load generator.
// Its purpose is to periodically query database connection stats
// during a load test and fail if connection limits are breached.

// --- TEST CONFIGURATION ---
const VUS = 1; // Only a single VU is needed to monitor health
const DURATION = __ENV.DURATION || '10m'; // Should run for the entire duration of the main test
const CHECK_INTERVAL = __ENV.CHECK_INTERVAL || 5; // Check every 5 seconds

// --- SERVICE URLS ---
const ADMIN_SERVICE_URL = __ENV.ADMIN_SERVICE_URL || 'http://user:3000'; // Assuming endpoint lives on User service
const AUTH_SERVICE_URL = __ENV.AUTH_SERVICE_URL || 'http://auth:3000';

// --- DATABASE CONNECTION THRESHOLDS ---
// Total baseline connections = 8 services * 15 pool size = 120
const MAX_ALLOWED_CONNECTIONS = __ENV.MAX_DB_CONNECTIONS || 150; // Total connections allowed across all pods
const ACTIVE_CONNECTION_THRESHOLD = __ENV.ACTIVE_DB_THRESHOLD || 100; // Threshold for active connections

// --- ADMIN CREDENTIALS ---
const ADMIN_USER = {
  email: 'admin-loadtest@nightbff.dev',
  password: 'password123'
};

// --- TEST METRICS ---
const dbConnections = new Gauge('db_connections_total');
const dbConnectionsActive = new Gauge('db_connections_active');
const dbConnectionsIdle = new Gauge('db_connections_idle');
const dbConnectionHeadroom = new Gauge('db_connection_headroom_percent');
const dbHealthCheckSuccess = new Rate('db_health_check_success');

// --- K6 OPTIONS ---
export let options = {
  vus: VUS,
  duration: DURATION,
  thresholds: {
    'db_connections_total': [`value<${MAX_ALLOWED_CONNECTIONS}`], // HARD FAIL if total connections exceed this
    'db_connections_active': [`value<${ACTIVE_CONNECTION_THRESHOLD}`], // HARD FAIL if active connections exceed this
    'db_health_check_success': ['rate>=1'], // All health checks must succeed
  },
};

// --- SETUP: AUTHENTICATE AS ADMIN ---
export function setup() {
  console.log('🩺 Database Health Monitor: Authenticating as admin...');
  const loginPayload = JSON.stringify({
    email: ADMIN_USER.email,
    password: ADMIN_USER.password,
  });

  const res = http.post(`${AUTH_SERVICE_URL}/api/auth/signin`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (res.status === 200 && res.json().data.session.accessToken) {
    console.log('✅ Admin authenticated successfully.');
    return { adminToken: res.json().data.session.accessToken };
  } else {
    throw new Error(`❌ Failed to authenticate admin for health monitor: ${res.status} ${res.body}`);
  }
}

// --- MAIN TEST FUNCTION ---
export default function(data) {
  const adminToken = data.adminToken;
  if (!adminToken) {
    console.error('❌ No admin token, skipping health check.');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
  };

  group('🩺 Database Connection Health Check', function() {
    // This endpoint needs to be created. It should return JSON like:
    // { "total": 50, "active": 10, "idle": 40 }
    const res = http.get(`${ADMIN_SERVICE_URL}/admin/db-stats`, { headers });

    const success = check(res, {
      'Health endpoint returned 200 OK': (r) => r.status === 200,
      'Response is valid JSON': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch (e) {
          return false;
        }
      },
    });

    dbHealthCheckSuccess.add(success);

    if (success) {
      const stats = res.json();
      const total = stats.total || 0;
      const active = stats.active || 0;
      const idle = stats.idle || 0;
      const headroom = ((MAX_ALLOWED_CONNECTIONS - total) / MAX_ALLOWED_CONNECTIONS) * 100;

      // Add stats to custom metrics
      dbConnections.add(total);
      dbConnectionsActive.add(active);
      dbConnectionsIdle.add(idle);
      dbConnectionHeadroom.add(headroom);

      console.log(`[DB HEALTH] Total: ${total}, Active: ${active}, Idle: ${idle}, Headroom: ${headroom.toFixed(1)}%`);
    } else {
      console.error(`❌ Database health check failed: ${res.status} - ${res.body}`);
    }
  });

  sleep(CHECK_INTERVAL);
} 