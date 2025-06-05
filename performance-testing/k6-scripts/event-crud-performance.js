import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Performance metrics
const errorRate = new Rate('errors');
const eventCreationTime = new Trend('event_creation_duration');
const eventSearchTime = new Trend('event_search_duration');
const attendeeOperationTime = new Trend('attendee_operation_duration');
const complexQueryTime = new Trend('complex_query_duration');
const authenticationTime = new Trend('authentication_duration');

// Service URLs
const AUTH_SERVICE_URL = 'http://auth:3000';
const BASE_URL = 'http://event:3000';

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 5 },  // Warm up
    { duration: '2m', target: 15 },  // Load testing
    { duration: '2m', target: 25 },  // Peak load
    { duration: '1m', target: 15 },  // Scale down
    { duration: '30s', target: 0 },  // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'], // Event service target: <300ms P95
    http_req_failed: ['rate<0.01'], // Less than 1% error rate
    errors: ['rate<0.01'],
    event_creation_duration: ['p(95)<250'],
    event_search_duration: ['p(95)<200'],
    attendee_operation_duration: ['p(95)<150'],
    complex_query_duration: ['p(95)<400'],
    authentication_duration: ['p(95)<400'],
  },
};

let createdEventIds = [];

// Helper function to build URLs with query parameters (k6 compatible)
function buildUrl(baseUrl, params = {}) {
  let url = baseUrl;
  const queryParams = Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  if (queryParams) {
    url += '?' + queryParams;
  }
  return url;
}

export function setup() {
  console.log('🚀 Starting Event Service Comprehensive Performance Test');
  console.log('🔐 Using dynamic authentication for fresh tokens');
  return {};
}

export default function () {
  let accessToken = null;
  let currentUserId = null;

  // 🔐 DYNAMIC AUTHENTICATION FLOW
  group('🔐 Event Service Authentication', function () {
    const randomUserIndex = Math.floor(Math.random() * 100);
    const loginPayload = JSON.stringify({
      email: `loadtest${randomUserIndex}@nightbff.dev`,
      password: 'password123',
    });

    const authStart = Date.now();
    const res = http.post(`${AUTH_SERVICE_URL}/api/auth/signin`, loginPayload, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    authenticationTime.add(Date.now() - authStart);

    const loginSuccess = check(res, {
      'Authentication successful': (r) => r.status === 200,
      'Access token received': (r) => {
        const data = r.json();
        return data && data.data && data.data.session && data.data.session.accessToken;
      },
    });

    if (loginSuccess && res.json() && res.json().data && res.json().data.session) {
      accessToken = res.json().data.session.accessToken;
      currentUserId = `test-user-${randomUserIndex}`;
    } else {
      errorRate.add(1);
      console.error(`❌ Authentication failed: ${res.status} - ${res.body}`);
      return;
    }
  });

  if (!accessToken) {
    errorRate.add(1);
    return;
  }

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  // 1. Event Creation Performance (25% of requests)
  if (Math.random() < 0.25) {
    testEventCreation(headers);
  }
  
  // 2. Event Search & Discovery (35% of requests)
  else if (Math.random() < 0.60) {
    testEventSearchAndDiscovery(headers);
  }
  
  // 3. Attendee Management (25% of requests)
  else if (Math.random() < 0.85) {
    testAttendeeManagement(headers);
  }
  
  // 4. Complex Queries & Analytics (15% of requests)
  else {
    testComplexQueriesAndAnalytics(headers);
  }

  sleep(0.5 + Math.random() * 1.5); // Random delay 0.5-2s
}

function testEventCreation(headers) {
  const eventData = {
    title: `Performance Test Event ${Date.now()}`,
    description: 'Automated performance test event for load testing',
    startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    endTime: new Date(Date.now() + 90000000).toISOString(), // Day after tomorrow
    attendeeLimit: Math.floor(Math.random() * 100) + 10, // 10-110 attendees
    visibility: Math.random() > 0.3 ? 'public' : 'private', // 70% public events
    requireApproval: Math.random() > 0.7, // 30% require approval
  };

  // Randomly add venueId for some events (to test different scenarios)
  if (Math.random() > 0.5) {
    // Don't include venueId for now - we'd need valid UUIDs from venue service
    eventData.customLocation = 'Test Location, San Francisco, CA';
  }

  const startTime = Date.now();
  const response = http.post(`${BASE_URL}/api/events`, JSON.stringify(eventData), { headers });
  const duration = Date.now() - startTime;
  
  eventCreationTime.add(duration);
  
  const success = check(response, {
    'Event creation successful': (r) => r.status === 201,
    'Event creation has valid response': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.id && data.title && data.startTime;
      } catch (e) {
        return false;
      }
    },
    'Event creation response time acceptable': () => duration < 500,
  });

  if (response.status !== 201) {
    errorRate.add(1);
    console.error(`❌ Event creation failed: ${response.status} - ${response.body}`);
  } else {
    try {
      const eventData = JSON.parse(response.body);
      createdEventIds.push(eventData.id);
    } catch (e) {
      console.warn(`⚠️ Event created but couldn't parse response for cleanup`);
    }
  }
}

function testEventSearchAndDiscovery(headers) {
  const searchScenarios = [
    // Basic search
    { endpoint: '/api/events', params: { limit: 20, offset: 0 } },
    
    // Search with text filter
    { endpoint: '/api/events', params: { search: 'test', limit: 10 } },
    
    // Date range filtering
    { 
      endpoint: '/api/events', 
      params: { 
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 604800000).toISOString(), // Next week
        limit: 15 
      } 
    },
    
    // Interest-based filtering
    { endpoint: '/api/events', params: { interestId: 'forYou', limit: 20 } },
    
    // Trending events
    { endpoint: '/api/events/trending', params: { limit: 10 } },
    
    // Personal events
    { endpoint: '/api/events/my-events', params: { limit: 10 } },
    
    // Attending events
    { endpoint: '/api/events/attending', params: { limit: 10 } },
  ];

  const scenario = searchScenarios[Math.floor(Math.random() * searchScenarios.length)];
  const url = buildUrl(`${BASE_URL}${scenario.endpoint}`, scenario.params);

  const startTime = Date.now();
  const response = http.get(url, { headers });
  const duration = Date.now() - startTime;
  
  eventSearchTime.add(duration);
  
  const success = check(response, {
    'Event search successful': (r) => r.status === 200,
    'Event search has valid response': (r) => {
      try {
        const data = JSON.parse(r.body);
        const hasValidData = (data.events !== undefined && Array.isArray(data.events)) || 
                            (data.items !== undefined && Array.isArray(data.items));
        return hasValidData && typeof data.total === 'number';
      } catch (e) {
        return false;
      }
    },
    'Event search response time acceptable': () => duration < 300,
  });

  if (response.status !== 200) {
    errorRate.add(1);
    console.error(`❌ Event search failed: ${response.status} - ${response.body}`);
  }
}

function testAttendeeManagement(headers) {
  // Get a random event to test attendee operations
  const eventsResponse = http.get(`${BASE_URL}/api/events?limit=50`, { headers });
  
  if (eventsResponse.status !== 200) {
    errorRate.add(1);
    return;
  }

  const eventsData = JSON.parse(eventsResponse.body);
  if (!eventsData.events || eventsData.events.length === 0) {
    return; // No events to test with
  }

  const randomEvent = eventsData.events[Math.floor(Math.random() * eventsData.events.length)];
  const eventId = randomEvent.id;

  // Test different attendee operations
  const operations = [
    () => testJoinEvent(eventId, headers),
    () => testLeaveEvent(eventId, headers),
    () => testGetAttendees(eventId, headers),
  ];

  const operation = operations[Math.floor(Math.random() * operations.length)];
  operation();
}

function testJoinEvent(eventId, headers) {
  const joinData = {
    message: 'Excited to attend this event!',
  };

  const startTime = Date.now();
  const response = http.post(
    `${BASE_URL}/api/events/${eventId}/join`,
    JSON.stringify(joinData),
    { headers }
  );
  const duration = Date.now() - startTime;
  
  attendeeOperationTime.add(duration);
  
  const success = check(response, {
    'Join event operation completed': (r) => r.status === 201 || r.status === 409 || r.status === 403,
    'Join event response time acceptable': () => duration < 200,
  });

  if (![201, 409, 403].includes(response.status)) {
    errorRate.add(1);
    console.error(`❌ Join event failed: ${response.status} - ${response.body}`);
  }
}

function testLeaveEvent(eventId, headers) {
  const startTime = Date.now();
  const response = http.del(`${BASE_URL}/api/events/${eventId}/leave`, null, { headers });
  const duration = Date.now() - startTime;
  
  attendeeOperationTime.add(duration);
  
  const success = check(response, {
    'Leave event operation completed': (r) => r.status === 204 || r.status === 404 || r.status === 400, 
    'Leave event response time acceptable': () => duration < 200,
  });

  if (![204, 404, 400].includes(response.status)) {
    errorRate.add(1);
    console.error(`❌ Leave event failed: ${response.status} - ${response.body}`);
  }
}

function testGetAttendees(eventId, headers) {
  const startTime = Date.now();
  const response = http.get(`${BASE_URL}/api/events/${eventId}/attendees?limit=20`, { headers });
  const duration = Date.now() - startTime;
  
  attendeeOperationTime.add(duration);
  
  const success = check(response, {
    'Get attendees successful': (r) => r.status === 200,
    'Get attendees has valid response': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data.attendees) && typeof data.total === 'number';
      } catch (e) {
        return false;
      }
    },
    'Get attendees response time acceptable': () => duration < 150,
  });

  if (response.status !== 200) {
    errorRate.add(1);
    console.error(`❌ Get attendees failed: ${response.status} - ${response.body}`);
  }
}

function testComplexQueriesAndAnalytics(headers) {
  const complexQueries = [
    // Complex search with multiple filters - FIXED: Removed invalid parameters
    {
      endpoint: '/api/events/search',
      params: {
        query: 'nightlife',
        limit: 20,
      }
    },
    
    // Trending with valid parameters - FIXED: Removed timeRange and city
    {
      endpoint: '/api/events/trending',
      params: {
        limit: 15,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 604800000).toISOString(), // Next week
      }
    },
  ];

  const query = complexQueries[Math.floor(Math.random() * complexQueries.length)];
  const url = buildUrl(`${BASE_URL}${query.endpoint}`, query.params);

  const startTime = Date.now();
  const response = http.get(url, { headers });
  const duration = Date.now() - startTime;
  
  complexQueryTime.add(duration);
  
  const success = check(response, {
    'Complex query successful': (r) => r.status === 200,
    'Complex query response time acceptable': () => duration < 500,
  });

  // FIXED: Only add to error rate if HTTP request actually failed
  if (response.status !== 200) {
    errorRate.add(1);
    console.error(`❌ Complex query failed: ${response.status} - ${response.body}`);
  }
}

export function teardown(data) {
  console.log('🧹 Event Service Performance Test Complete');
  console.log(`📊 Total events created during test: ${createdEventIds.length}`);
  
  // Optional: Clean up created test events
  if (createdEventIds.length > 0) {
    console.log('🗑️  Cleaning up test events...');
    // Note: Could add cleanup logic here if needed
  }
} 