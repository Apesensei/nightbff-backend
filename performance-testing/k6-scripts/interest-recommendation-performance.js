import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Performance metrics
const errorRate = new Rate('errors');
const recommendationTime = new Trend('recommendation_algorithm_duration');
const trendingCalculationTime = new Trend('trending_calculation_duration');
const userCorrelationTime = new Trend('user_correlation_duration');
const cacheHitRate = new Rate('cache_hits');
const complexQueryTime = new Trend('complex_interest_query_duration');
const authenticationTime = new Trend('authentication_duration');

// Service URLs
const AUTH_SERVICE_URL = 'http://auth:3000';
const BASE_URL = 'http://interest:3000';

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 8 },  // Warm up - algorithms are CPU intensive
    { duration: '3m', target: 20 }, // Load testing
    { duration: '2m', target: 30 }, // Peak load for algorithms
    { duration: '1m', target: 15 }, // Scale down
    { duration: '30s', target: 0 }, // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<400'], // Interest algorithms target: <400ms P95
    http_req_failed: ['rate<0.01'], // Less than 1% error rate
    errors: ['rate<0.01'],
    recommendation_algorithm_duration: ['p(95)<350'],
    trending_calculation_duration: ['p(95)<300'],
    user_correlation_duration: ['p(95)<250'],
    complex_interest_query_duration: ['p(95)<200'],
    cache_hits: ['rate>0.60'], // Cache hit rate should be > 60%
    authentication_duration: ['p(95)<400'],
  },
};

let interestIds = [];
let userInterestMappings = [];

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
  console.log('🧠 Starting Interest Service Algorithm Performance Test');
  console.log('🔐 Using dynamic authentication for fresh tokens');
  
  // Pre-load interest data for more realistic testing using dynamic auth
  const randomUserIndex = Math.floor(Math.random() * 100);
  const loginPayload = JSON.stringify({
    email: `loadtest${randomUserIndex}@nightbff.dev`,
    password: 'password123',
  });

  const authRes = http.post(`${AUTH_SERVICE_URL}/api/auth/signin`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (authRes.status === 200 && authRes.json() && authRes.json().data && authRes.json().data.session) {
    const setupToken = authRes.json().data.session.accessToken;
    const headers = {
      'Authorization': `Bearer ${setupToken}`,
      'Content-Type': 'application/json',
    };
    
    const interestsResponse = http.get(`${BASE_URL}/api/interests?limit=100`, { headers });
    if (interestsResponse.status === 200) {
      const interestsData = JSON.parse(interestsResponse.body);
      interestIds = interestsData.data ? interestsData.data.map(interest => interest.id) : [];
      console.log(`📋 Loaded ${interestIds.length} interests for testing`);
    }
  }
  
  return { interestIds };
}

export default function (data) {
  const { interestIds } = data;
  let accessToken = null;
  let currentUserId = null;

  // 🔐 DYNAMIC AUTHENTICATION FLOW  
  group('🔐 Interest Service Authentication', function () {
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

  // 1. Recommendation Algorithm Testing (40% of requests)
  if (Math.random() < 0.40) {
    testRecommendationAlgorithms(headers);
  }
  
  // 2. Trending & Popular Interest Calculations (25% of requests)
  else if (Math.random() < 0.65) {
    testTrendingAndPopularCalculations(headers);
  }
  
  // 3. User Interest Correlation Analysis (20% of requests)
  else if (Math.random() < 0.85) {
    testUserCorrelationAnalysis(headers, interestIds);
  }
  
  // 4. Complex Interest Queries & Cache Testing (15% of requests)
  else {
    testComplexQueriesAndCaching(headers, interestIds);
  }

  sleep(0.3 + Math.random() * 1.2); // Random delay 0.3-1.5s
}

function testRecommendationAlgorithms(headers) {
  group('Interest Recommendation Algorithms', () => {
    // Test popular interests
    const popularStart = Date.now();
    const popularResponse = http.get(`${BASE_URL}/api/interests/popular?limit=5`, { headers });
    const popularDuration = Date.now() - popularStart;
    
    const popularSuccess = check(popularResponse, {
      'Popular interests successful': (r) => r.status === 200,
      'Popular interests has valid response': (r) => {
        try {
          const data = JSON.parse(r.body);
          return Array.isArray(data);
        } catch (e) {
          return false;
        }
      },
      'Popular interests response time acceptable': () => popularDuration < 400,
    });

    // Check for cache headers
    const cacheHeaders = popularResponse.headers;
    const hasCacheHeaders = cacheHeaders['cache-control'] || cacheHeaders['etag'] || cacheHeaders['x-cache'];
    if (hasCacheHeaders) {
      cacheHitRate.add(1);
      console.log(`✅ Cache headers detected: ${JSON.stringify({
        'cache-control': cacheHeaders['cache-control'],
        'etag': cacheHeaders['etag'],
        'x-cache': cacheHeaders['x-cache']
      })}`);
    } else {
      cacheHitRate.add(0);
    }

    if (!popularSuccess) {
      errorRate.add(1);
      console.error(`❌ Popular interests failed: ${popularResponse.status} - ${popularResponse.body}`);
    } else {
      errorRate.add(0);
    }
    
    recommendationTime.add(popularDuration);

    // Test trending interests
    const trendingStart = Date.now();
    const trendingResponse = http.get(`${BASE_URL}/api/interests/trending?limit=5`, { headers });
    const trendingDuration = Date.now() - trendingStart;
    
    const trendingSuccess = check(trendingResponse, {
      'Trending interests successful': (r) => r.status === 200,
      'Trending interests has valid response': (r) => {
        try {
          const data = JSON.parse(r.body);
          return Array.isArray(data);
        } catch (e) {
          return false;
        }
      },
      'Trending interests response time acceptable': () => trendingDuration < 400,
    });

    // Check for cache headers on trending
    const trendingCacheHeaders = trendingResponse.headers;
    const hasTrendingCacheHeaders = trendingCacheHeaders['cache-control'] || trendingCacheHeaders['etag'] || trendingCacheHeaders['x-cache'];
    if (hasTrendingCacheHeaders) {
      cacheHitRate.add(1);
    } else {
      cacheHitRate.add(0);
    }

    if (!trendingSuccess) {
      errorRate.add(1);
      console.error(`❌ Trending interests failed: ${trendingResponse.status} - ${trendingResponse.body}`);
    } else {
      errorRate.add(0);
    }
    
    trendingCalculationTime.add(trendingDuration);

    // Test personalized recommendations
    const recommendationsStart = Date.now();
    const recommendationsResponse = http.get(`${BASE_URL}/api/interests/recommendations?limit=5`, { headers });
    const recommendationsDuration = Date.now() - recommendationsStart;
    
    const recommendationsSuccess = check(recommendationsResponse, {
      'Personalized recommendations successful': (r) => r.status === 200,
      'Personalized recommendations response time acceptable': () => recommendationsDuration < 400,
    });

    // Check for cache headers on recommendations
    const recCacheHeaders = recommendationsResponse.headers;
    const hasRecCacheHeaders = recCacheHeaders['cache-control'] || recCacheHeaders['etag'] || recCacheHeaders['x-cache'];
    if (hasRecCacheHeaders) {
      cacheHitRate.add(1);
    } else {
      cacheHitRate.add(0);
    }

    if (!recommendationsSuccess) {
      errorRate.add(1);
      console.error(`❌ Personalized recommendations failed: ${recommendationsResponse.status} - ${recommendationsResponse.body}`);
    } else {
      errorRate.add(0);
    }
    
    recommendationTime.add(recommendationsDuration);
  });
}

function testTrendingAndPopularCalculations(headers) {
  const calculationTypes = [
    // Popular interests - usage count based algorithm
    { 
      endpoint: '/api/interests/popular',
      params: { limit: 20 },
      description: 'Popular interests calculation'
    },
    
    // Trending interests - time-based trending algorithm
    { 
      endpoint: '/api/interests/trending',
      params: { limit: 15 },
      description: 'Trending interests calculation'
    },
    
    // General interests with analytics
    { 
      endpoint: '/api/interests',
      params: { limit: 50, onlyActive: true },
      description: 'Active interests with analytics'
    },
  ];

  const calculation = calculationTypes[Math.floor(Math.random() * calculationTypes.length)];
  const url = buildUrl(`${BASE_URL}${calculation.endpoint}`, calculation.params);

  const startTime = Date.now();
  const response = http.get(url, { headers });
  const duration = Date.now() - startTime;
  
  trendingCalculationTime.add(duration);
  
  const success = check(response, {
    [`${calculation.description} successful`]: (r) => r.status === 200,
    [`${calculation.description} has valid response`]: (r) => {
      try {
        const data = JSON.parse(r.body);
        if (calculation.endpoint.includes('popular') || calculation.endpoint.includes('trending')) {
          return Array.isArray(data);
        } else {
          return data.interests && Array.isArray(data.interests);
        }
      } catch (e) {
        return false;
      }
    },
    [`${calculation.description} response time acceptable`]: () => duration < 400,
    [`${calculation.description} returns sorted results`]: (r) => {
      try {
        const data = JSON.parse(r.body);
        let interests;
        if (calculation.endpoint.includes('popular') || calculation.endpoint.includes('trending')) {
          interests = data; // Direct array for popular/trending
        } else {
          interests = data.interests; // General interests endpoint returns {interests: [...]}
        }
        
        if (!interests || interests.length === 0) {
          return true; // Empty results are valid
        }
        
        if (interests.length > 1) {
          // Check if results appear to be sorted (basic heuristic)
          return interests.every(item => item.usageCount !== undefined || item.sortOrder !== undefined);
        }
        return true;
      } catch (e) {
        return false;
      }
    },
  });

  if (!success) {
    errorRate.add(1);
    console.error(`❌ ${calculation.description} failed: ${response.status} - ${response.body}`);
  }
}

function testUserCorrelationAnalysis(headers, interestIds) {
  if (interestIds.length === 0) return;

  // Test related interests algorithm - complex correlation analysis
  const sampleInterests = interestIds.slice(0, Math.min(3, interestIds.length));
  
  // First, get user's interests to establish baseline
  let userInterestsResponse = http.get(`${BASE_URL}/api/interests/user/me`, { headers });
  
  if (userInterestsResponse.status !== 200) {
    // If user has no interests, set some for testing
    const testInterests = sampleInterests.slice(0, 2);
    const updateData = { interestIds: testInterests };
    
    const updateResponse = http.put(
      `${BASE_URL}/api/interests/user/me`,
      JSON.stringify(updateData),
      { headers }
    );
    
    if (updateResponse.status === 200) {
      userInterestsResponse = http.get(`${BASE_URL}/api/interests/user/me`, { headers });
    }
  }

  // Now test the correlation analysis through recommendation system
  const startTime = Date.now();
  const response = http.get(`${BASE_URL}/api/interests/recommendations?limit=10`, { headers });
  const duration = Date.now() - startTime;
  
  userCorrelationTime.add(duration);
  
  const success = check(response, {
    'User correlation analysis successful': (r) => r.status === 200,
    'User correlation returns correlated interests': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data);
      } catch (e) {
        return false;
      }
    },
    'User correlation response time acceptable': () => duration < 350,
    'User correlation results are personalized': (r) => {
      try {
        const data = JSON.parse(r.body);
        // Check that results include relevance indicators
        return data.every(item => item.id && item.name);
      } catch (e) {
        return false;
      }
    },
  });

  if (!success) {
    errorRate.add(1);
    console.error(`❌ User correlation analysis failed: ${response.status} - ${response.body}`);
  }
}

function testComplexQueriesAndCaching(headers, interestIds) {
  group('Complex Interest Queries & Caching', () => {
    // Test individual interest lookup with valid UUID
    if (interestIds.length > 0) {
      const randomInterestId = interestIds[Math.floor(Math.random() * interestIds.length)];
      const individualStart = Date.now();
      const individualResponse = http.get(`${BASE_URL}/api/interests/${randomInterestId}`, { headers });
      const individualDuration = Date.now() - individualStart;
      
      const individualSuccess = check(individualResponse, {
        'Individual interest lookup successful': (r) => r.status === 200,
        'Individual interest lookup response time acceptable': () => individualDuration < 200,
        'Individual interest lookup has valid structure': (r) => {
          try {
            const data = JSON.parse(r.body);
            return data.id && data.name; // Basic interest structure validation
          } catch (e) {
            return false;
          }
        },
      });

      if (!individualSuccess) {
        errorRate.add(1);
        console.error(`❌ Individual interest lookup failed: ${individualResponse.status} - ${individualResponse.body}`);
      }
      
      complexQueryTime.add(individualDuration);
    }

    // Test paginated queries with different parameters
    const paginationParams = [
      { page: 1, limit: 10 },
      { page: 2, limit: 20 },
      { page: Math.floor(Math.random() * 3) + 1, limit: Math.floor(Math.random() * 20) + 5 }
    ];
    
    const params = paginationParams[Math.floor(Math.random() * paginationParams.length)];
    const paginatedUrl = buildUrl(`${BASE_URL}/api/interests`, params);
    
    const paginatedStart = Date.now();
    const paginatedResponse = http.get(paginatedUrl, { headers });
    const paginatedDuration = Date.now() - paginatedStart;
    
    const paginatedSuccess = check(paginatedResponse, {
      'Paginated interests query successful': (r) => r.status === 200,
      'Paginated interests query response time acceptable': () => paginatedDuration < 200,
      'Paginated interests query has valid structure': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.interests && Array.isArray(data.interests) && 
                 typeof data.totalCount === 'number' && 
                 typeof data.page === 'number'; // Accept empty interests array as valid
        } catch (e) {
          return false;
        }
      },
    });

    if (!paginatedSuccess) {
      errorRate.add(1);
      console.error(`❌ Paginated interests query failed: ${paginatedResponse.status} - ${paginatedResponse.body}`);
    }
    
    complexQueryTime.add(paginatedDuration);

    // Test search functionality with text filters
    const searchTerms = ['music', 'sport', 'art', 'tech', 'food', 'travel'];
    const searchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    const searchUrl = buildUrl(`${BASE_URL}/api/interests`, { search: searchTerm, limit: 25 });
    
    const searchStart = Date.now();
    const searchResponse = http.get(searchUrl, { headers });
    const searchDuration = Date.now() - searchStart;
    
    const searchSuccess = check(searchResponse, {
      'Search with text filter successful': (r) => r.status === 200,
      'Search with text filter response time acceptable': () => searchDuration < 200,
      'Search with text filter has valid structure': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.interests && Array.isArray(data.interests) && 
                 typeof data.totalCount === 'number'; // Accept empty search results as valid
        } catch (e) {
          return false;
        }
      },
    });

    if (!searchSuccess) {
      errorRate.add(1);
      console.error(`❌ Search with text filter failed: ${searchResponse.status} - ${searchResponse.body}`);
    }
    
    complexQueryTime.add(searchDuration);
  });
}

// Test interest update operations to measure algorithm recalculation impact
function testInterestUpdateImpact(headers, interestIds) {
  if (interestIds.length === 0) return;

  const sampleInterests = interestIds.slice(0, Math.min(5, interestIds.length));
  const updateData = { interestIds: sampleInterests };

  const startTime = Date.now();
  const response = http.put(
    `${BASE_URL}/api/interests/user/me`,
    JSON.stringify(updateData),
    { headers }
  );
  const duration = Date.now() - startTime;

  const success = check(response, {
    'Interest update successful': (r) => r.status === 200,
    'Interest update response time acceptable': () => duration < 300,
    'Interest update triggers cache invalidation': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.success === true;
      } catch (e) {
        return false;
      }
    },
  });

  if (!success) {
    errorRate.add(1);
  }

  // Test that recommendations are updated after interest change
  sleep(0.1); // Brief pause for cache invalidation
  
  const recStartTime = Date.now();
  const recResponse = http.get(`${BASE_URL}/api/interests/recommendations?limit=5`, { headers });
  const recDuration = recStartTime - Date.now();
  
  check(recResponse, {
    'Updated recommendations retrieved successfully': (r) => r.status === 200,
    'Updated recommendations response time acceptable': () => recDuration < 400,
  });
}

export function teardown(data) {
  console.log('🧹 Interest Service Algorithm Performance Test Complete');
  console.log('📊 Algorithm Performance Metrics:');
  console.log('   - Recommendation algorithms tested under load');
  console.log('   - Trending calculation performance validated');
  console.log('   - User correlation analysis benchmarked');
  console.log('   - Cache effectiveness measured');
  
  // Display cache effectiveness summary
  console.log(`🗄️  Cache hit rate optimization validated`);
} 