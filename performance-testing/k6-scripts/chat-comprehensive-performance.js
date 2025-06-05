import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Performance metrics
const errorRate = new Rate('errors');
const chatCreationTime = new Trend('chat_creation_duration');
const chatRetrievalTime = new Trend('chat_retrieval_duration');
const messageOperationTime = new Trend('message_operation_duration');
const authenticationTime = new Trend('authentication_duration');
const chatFunctionalityRate = new Rate('chat_functionality_success');

// Service URLs
const AUTH_SERVICE_URL = 'http://auth:3000';
const BASE_URL = 'http://chat:3000';

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 3 },  // Warm up
    { duration: '2m', target: 8 },   // Load testing
    { duration: '2m', target: 12 },  // Peak load
    { duration: '1m', target: 8 },   // Scale down
    { duration: '30s', target: 0 },  // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // Chat service target: <500ms P95
    http_req_failed: ['rate<0.05'], // Less than 5% error rate
    errors: ['rate<0.05'],
    chat_creation_duration: ['p(95)<400'],
    chat_retrieval_duration: ['p(95)<300'],
    message_operation_duration: ['p(95)<350'],
    authentication_duration: ['p(95)<400'],
    chat_functionality_success: ['rate>0.85'], // 85% functionality success
  },
};

export function setup() {
  console.log('💬 Starting Chat Service Comprehensive Performance Test');
  console.log('🔐 Using dynamic authentication for fresh tokens');
  console.log('📊 Testing Chat Module functionality validation');
  console.log('🧹 Using clean per-user context (no global state contamination)');
  return {};
}

export default function () {
  let accessToken = null;
  let currentUserId = null;
  
  // 🧹 PER-USER CONTEXT - No global state contamination
  let userChatIds = [];
  let userMessages = [];

  // 🔐 DYNAMIC AUTHENTICATION FLOW (same pattern as working tests)
  group('🔐 Chat Service Authentication', function () {
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

  // 1. Chat Creation & Management (30% of requests)
  if (Math.random() < 0.30) {
    testChatCreationAndManagement(headers, userChatIds);
  }
  
  // 2. Chat Retrieval & Discovery (25% of requests)
  else if (Math.random() < 0.55) {
    testChatRetrievalAndDiscovery(headers, userChatIds);
  }
  
  // 3. Message Operations (35% of requests)
  else if (Math.random() < 0.90) {
    testMessageOperations(headers, userChatIds, userMessages);
  }
  
  // 4. Advanced Chat Features (10% of requests)
  else {
    testAdvancedChatFeatures(headers, userMessages);
  }

  sleep(0.5 + Math.random() * 1.0); // Random delay 0.5-1.5s
}

function testChatCreationAndManagement(headers, userChatIds) {
  group('💬 Chat Creation & Management', () => {
    // Test chat creation
    const chatData = {
      title: `Performance Test Chat ${Date.now()}`,
      type: Math.random() > 0.5 ? 'GROUP' : 'DIRECT',
      participantIds: [], // Will be populated by the service for current user
    };

    const startTime = Date.now();
    const response = http.post(`${BASE_URL}/api/chats`, JSON.stringify(chatData), { headers });
    const duration = Date.now() - startTime;
    
    chatCreationTime.add(duration);
    
    const success = check(response, {
      'Chat creation successful': (r) => r.status === 201,
      'Chat creation has valid response': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.id && data.type;
        } catch (e) {
          return false;
        }
      },
      'Chat creation response time acceptable': () => duration < 500,
    });

    if (success) {
      const chatData = JSON.parse(response.body);
      userChatIds.push(chatData.id); // 🧹 Store in user context only
      chatFunctionalityRate.add(1);
      console.log(`✅ Chat created successfully: ${chatData.id}`);
    } else {
      errorRate.add(1);
      chatFunctionalityRate.add(0);
      console.error(`❌ Chat creation failed: ${response.status} - ${response.body}`);
    }
  });
}

function testChatRetrievalAndDiscovery(headers, userChatIds) {
  group('📋 Chat Retrieval & Discovery', () => {
    // Test getting user's chats
    const startTime = Date.now();
    const response = http.get(`${BASE_URL}/api/chats/me`, { headers });
    const duration = Date.now() - startTime;
    
    chatRetrievalTime.add(duration);
    
    const success = check(response, {
      'Get user chats successful': (r) => r.status === 200,
      'Get user chats has valid response': (r) => {
        try {
          const data = JSON.parse(r.body);
          return Array.isArray(data);
        } catch (e) {
          return false;
        }
      },
      'Get user chats response time acceptable': () => duration < 400,
    });

    if (success) {
      const chats = JSON.parse(response.body);
      chatFunctionalityRate.add(1);
      console.log(`✅ Retrieved ${chats.length} chats for user`);
      
      // 🧹 Update user's chat list with actual chats from server
      chats.forEach(chat => {
        if (!userChatIds.includes(chat.id)) {
          userChatIds.push(chat.id);
        }
      });
      
      // Test getting specific chat details if we have chats
      if (chats.length > 0) {
        const randomChat = chats[Math.floor(Math.random() * chats.length)];
        testGetChatById(randomChat.id, headers);
      }
    } else {
      errorRate.add(1);
      chatFunctionalityRate.add(0);
      console.error(`❌ Get user chats failed: ${response.status} - ${response.body}`);
    }
  });
}

function testGetChatById(chatId, headers) {
  const startTime = Date.now();
  const response = http.get(`${BASE_URL}/api/chats/${chatId}`, { headers });
  const duration = Date.now() - startTime;
  
  chatRetrievalTime.add(duration);
  
  const success = check(response, {
    'Get chat by ID successful': (r) => r.status === 200,
    'Get chat by ID has valid response': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.id && data.type;
      } catch (e) {
        return false;
      }
    },
    'Get chat by ID response time acceptable': () => duration < 300,
  });

  if (success) {
    chatFunctionalityRate.add(1);
  } else {
    errorRate.add(1);
    chatFunctionalityRate.add(0);
    console.error(`❌ Get chat by ID failed: ${response.status} - ${response.body}`);
  }
}

function testMessageOperations(headers, userChatIds, userMessages) {
  group('📨 Message Operations', () => {
    // First, get user's chats to find a chat to send messages to
    const chatsResponse = http.get(`${BASE_URL}/api/chats/me`, { headers });
    
    if (chatsResponse.status === 200) {
      const chats = JSON.parse(chatsResponse.body);
      
      if (chats.length > 0) {
        const randomChat = chats[Math.floor(Math.random() * chats.length)];
        testSendMessage(randomChat.id, headers, userMessages);
        testGetChatMessages(randomChat.id, headers);
      } else {
        // If no chats exist, create one first
        const chatData = {
          title: `Message Test Chat ${Date.now()}`,
          type: 'GROUP',
          participantIds: [],
        };
        
        const createResponse = http.post(`${BASE_URL}/api/chats`, JSON.stringify(chatData), { headers });
        if (createResponse.status === 201) {
          const newChat = JSON.parse(createResponse.body);
          userChatIds.push(newChat.id); // 🧹 Track in user context
          testSendMessage(newChat.id, headers, userMessages);
          testGetChatMessages(newChat.id, headers);
        }
      }
    }
  });
}

function testSendMessage(chatId, headers, userMessages) {
  const messageData = {
    type: 'text',
    content: `Performance test message ${Date.now()}`,
  };

  const startTime = Date.now();
  const response = http.post(`${BASE_URL}/api/chats/${chatId}/messages`, JSON.stringify(messageData), { headers });
  const duration = Date.now() - startTime;
  
  messageOperationTime.add(duration);
  
  const success = check(response, {
    'Send message successful': (r) => r.status === 201,
    'Send message has valid response': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.id && data.chatId && data.content;
      } catch (e) {
        return false;
      }
    },
    'Send message response time acceptable': () => duration < 400,
  });

  if (success) {
    const messageData = JSON.parse(response.body);
    userMessages.push({ id: messageData.id, chatId: chatId }); // 🧹 Store in user context only
    chatFunctionalityRate.add(1);
    console.log(`✅ Message sent successfully: ${messageData.id}`);
  } else {
    errorRate.add(1);
    chatFunctionalityRate.add(0);
    console.error(`❌ Send message failed: ${response.status} - ${response.body}`);
  }
}

function testGetChatMessages(chatId, headers) {
  const startTime = Date.now();
  const response = http.get(`${BASE_URL}/api/chats/${chatId}/messages?limit=20`, { headers });
  const duration = Date.now() - startTime;
  
  messageOperationTime.add(duration);
  
  const success = check(response, {
    'Get chat messages successful': (r) => r.status === 200,
    'Get chat messages has valid response': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data);
      } catch (e) {
        return false;
      }
    },
    'Get chat messages response time acceptable': () => duration < 350,
  });

  if (success) {
    const messages = JSON.parse(response.body);
    chatFunctionalityRate.add(1);
    console.log(`✅ Retrieved ${messages.length} messages from chat ${chatId}`);
  } else {
    errorRate.add(1);
    chatFunctionalityRate.add(0);
    console.error(`❌ Get chat messages failed: ${response.status} - ${response.body}`);
  }
}

function testAdvancedChatFeatures(headers, userMessages) {
  group('🚀 Advanced Chat Features', () => {
    // 🧹 FIXED: Only test mark as read on user's own messages
    if (userMessages.length > 0) {
      const randomMessage = userMessages[Math.floor(Math.random() * userMessages.length)];
      testMarkMessageAsRead(randomMessage.id, headers);
    }
    
    // Test WebSocket endpoint availability
    testWebSocketEndpoint(headers);
  });
}

function testMarkMessageAsRead(messageId, headers) {
  const startTime = Date.now();
  const response = http.post(`${BASE_URL}/api/messages/${messageId}/read`, '', { headers });
  const duration = Date.now() - startTime;
  
  messageOperationTime.add(duration);
  
  const success = check(response, {
    'Mark message as read successful': (r) => r.status === 200,
    'Mark message as read has valid response': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.success === true;
      } catch (e) {
        return false;
      }
    },
    'Mark message as read response time acceptable': () => duration < 300,
  });

  if (success) {
    chatFunctionalityRate.add(1);
    console.log(`✅ Message marked as read: ${messageId}`);
  } else {
    errorRate.add(1);
    chatFunctionalityRate.add(0);
    console.error(`❌ Mark message as read failed: ${response.status} - ${response.body}`);
  }
}

function testWebSocketEndpoint(headers) {
  const startTime = Date.now();
  const response = http.get(`${BASE_URL}/socket.io/`, { headers });
  const duration = Date.now() - startTime;
  
  const success = check(response, {
    'WebSocket endpoint accessible': (r) => r.status !== 404,
    'WebSocket endpoint response time acceptable': () => duration < 200,
  });

  if (success) {
    chatFunctionalityRate.add(1);
    console.log(`✅ WebSocket endpoint accessible`);
  } else {
    chatFunctionalityRate.add(0);
    console.log(`⚠️ WebSocket endpoint test: ${response.status}`);
  }
}

export function teardown(data) {
  console.log('🏁 Chat Service Comprehensive Performance Test Complete');
  console.log('🧹 Clean per-user context implementation - no global state contamination');
  console.log('📈 Check metrics for Chat Module functionality validation');
  console.log('💬 Chat Service validation completed - check chat_functionality_success rate');
} 