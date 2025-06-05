import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const chatCreationRate = new Rate('chat_creation_success');
const messageCreationRate = new Rate('message_creation_success');
const chatRetrievalRate = new Rate('chat_retrieval_success');
const authSuccessRate = new Rate('auth_success_rate');

const chatCreationTime = new Trend('chat_creation_duration');
const messageCreationTime = new Trend('message_creation_duration');
const chatRetrievalTime = new Trend('chat_retrieval_duration');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 5 },   // Ramp up
    { duration: '60s', target: 10 },  // Steady load
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],    // Error rate under 10%
    chat_creation_success: ['rate>0.8'], // 80% success rate
    message_creation_success: ['rate>0.8'],
    chat_retrieval_success: ['rate>0.9'],
  },
};

const BASE_URL = 'http://chat:3000';

// Test user credentials (these should exist in test database)
const TEST_USERS = [
  { email: 'user1@test.com', password: 'testpass123' },
  { email: 'user2@test.com', password: 'testpass123' },
  { email: 'user3@test.com', password: 'testpass123' },
];

let authTokens = {};

export function setup() {
  console.log('🚀 Starting Chat Performance Validation');
  console.log('📊 Testing Chat Module functionality in Docker environment');
  
  // Pre-authenticate test users
  TEST_USERS.forEach((user, index) => {
    const loginResponse = http.post(`${BASE_URL}/api/auth/signin`, JSON.stringify({
      email: user.email,
      password: user.password
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (loginResponse.status === 200 || loginResponse.status === 201) {
      const responseBody = JSON.parse(loginResponse.body);
      authTokens[`user${index + 1}`] = responseBody.access_token || responseBody.token;
      console.log(`✅ Pre-authenticated user${index + 1}`);
    } else {
      console.log(`❌ Failed to pre-authenticate user${index + 1}: ${loginResponse.status}`);
    }
  });
  
  return { authTokens };
}

export default function(data) {
  const userIndex = Math.floor(Math.random() * TEST_USERS.length);
  const currentUser = TEST_USERS[userIndex];
  const userKey = `user${userIndex + 1}`;
  
  // Get or create auth token
  let authToken = data.authTokens[userKey];
  
  if (!authToken) {
    // Try to authenticate
    const loginResponse = http.post(`${BASE_URL}/api/auth/signin`, JSON.stringify({
      email: currentUser.email,
      password: currentUser.password
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    const authSuccess = check(loginResponse, {
      'Authentication successful': (r) => r.status === 200 || r.status === 201,
      'Auth response time < 200ms': (r) => r.timings.duration < 200,
    });
    
    authSuccessRate.add(authSuccess);
    
    if (authSuccess) {
      const responseBody = JSON.parse(loginResponse.body);
      authToken = responseBody.access_token || responseBody.token;
    } else {
      console.log(`❌ Authentication failed for ${currentUser.email}: ${loginResponse.status}`);
      return; // Skip this iteration
    }
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  };
  
  // Test 1: Get user's chats
  const getChatsStart = Date.now();
  const getChatsResponse = http.get(`${BASE_URL}/api/chats/me`, { headers });
  const getChatsTime = Date.now() - getChatsStart;
  
  const chatsRetrieved = check(getChatsResponse, {
    'Get chats successful': (r) => r.status === 200,
    'Get chats response time < 300ms': (r) => r.timings.duration < 300,
    'Get chats returns array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body) || Array.isArray(body.data);
      } catch (e) {
        return false;
      }
    },
  });
  
  chatRetrievalRate.add(chatsRetrieved);
  chatRetrievalTime.add(getChatsTime);
  
  // Test 2: Create a new chat (if endpoint exists)
  const createChatStart = Date.now();
  const createChatResponse = http.post(`${BASE_URL}/api/chats`, JSON.stringify({
    name: `Test Chat ${Date.now()}`,
    type: 'group',
    participants: [userIndex + 1] // Include current user
  }), { headers });
  const createChatTime = Date.now() - createChatStart;
  
  const chatCreated = check(createChatResponse, {
    'Create chat response received': (r) => r.status !== 0,
    'Create chat not server error': (r) => r.status < 500,
    'Create chat response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  chatCreationRate.add(chatCreated && (createChatResponse.status === 200 || createChatResponse.status === 201));
  chatCreationTime.add(createChatTime);
  
  let chatId = null;
  if (createChatResponse.status === 200 || createChatResponse.status === 201) {
    try {
      const responseBody = JSON.parse(createChatResponse.body);
      chatId = responseBody.id || responseBody.chatId;
    } catch (e) {
      console.log('Failed to parse create chat response');
    }
  }
  
  // Test 3: Send a message (if we have a chat ID)
  if (chatId) {
    const sendMessageStart = Date.now();
    const sendMessageResponse = http.post(`${BASE_URL}/api/chats/${chatId}/messages`, JSON.stringify({
      content: `Test message ${Date.now()}`,
      type: 'text'
    }), { headers });
    const sendMessageTime = Date.now() - sendMessageStart;
    
    const messageCreated = check(sendMessageResponse, {
      'Send message response received': (r) => r.status !== 0,
      'Send message not server error': (r) => r.status < 500,
      'Send message response time < 400ms': (r) => r.timings.duration < 400,
    });
    
    messageCreationRate.add(messageCreated && (sendMessageResponse.status === 200 || sendMessageResponse.status === 201));
    messageCreationTime.add(sendMessageTime);
  }
  
  // Test 4: Test WebSocket endpoint availability (basic connectivity)
  const wsTestResponse = http.get(`${BASE_URL}/socket.io/`, { headers });
  check(wsTestResponse, {
    'WebSocket endpoint accessible': (r) => r.status !== 404,
    'WebSocket response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  sleep(1); // Brief pause between iterations
}

export function teardown(data) {
  console.log('🏁 Chat Performance Validation Complete');
  console.log('📈 Check metrics for Chat Module functionality validation');
} 