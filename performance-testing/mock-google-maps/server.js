const express = require('express');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_LATENCY_MS = parseInt(process.env.MOCK_BASE_LATENCY_MS, 10) || 50; // Default 50ms base latency
const MAX_RANDOM_LATENCY_MS = parseInt(process.env.MOCK_MAX_RANDOM_LATENCY_MS, 10) || 150; // Default up to 150ms additional random
const ERROR_RATE_PERCENT = parseFloat(process.env.MOCK_ERROR_RATE_PERCENT) || 0.05; // Default 5% error rate

app.use(morgan('dev'));
app.use(express.json());

// Middleware for simulating latency and errors
const simulateNetworkConditions = (req, res, next) => {
  // Simulate errors
  if (Math.random() < ERROR_RATE_PERCENT) {
    const errorStatus = Math.random() < 0.5 ? 500 : 429; // Randomly pick 500 or 429
    const errorMessage = errorStatus === 500 ? 'Mock Internal Server Error' : 'Mock Too Many Requests';
    console.log(`Simulating ${errorStatus} error for ${req.path}`);
    // Delay even for errors
    const totalLatency = BASE_LATENCY_MS + Math.floor(Math.random() * MAX_RANDOM_LATENCY_MS);
    setTimeout(() => {
      res.status(errorStatus).json({ error: errorMessage, status: 'ERROR' });
    }, totalLatency);
    return; // Stop further processing
  }

  // Simulate latency
  const totalLatency = BASE_LATENCY_MS + Math.floor(Math.random() * MAX_RANDOM_LATENCY_MS);
  console.log(`Simulating ${totalLatency}ms latency for ${req.path}`);
  setTimeout(next, totalLatency);
};

// Apply middleware to all relevant API routes
app.use('/maps/api', simulateNetworkConditions);

// Mock data store (can be expanded or made dynamic)
const mockPlaceDetails = {
  result: {
    place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
    name: 'Mock Googleplex',
    formatted_address: '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
    geometry: {
      location: {
        lat: 37.42200,
        lng: -122.08400
      }
    },
    photos: [
      {
        photo_reference: 'CmRaAAAA...mockPhotoRef1',
        height: 1080,
        width: 1920,
        html_attributions: ['Mock Author']
      }
    ],
    types: ['mock_type', 'establishment'],
    rating: 4.5,
    user_ratings_total: 1000
  },
  status: 'OK'
};

const mockNearbySearch = {
  results: [
    {
      place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
      name: 'Mock Venue 1',
      geometry: { location: { lat: 37.4220, lng: -122.0840 } },
      vicinity: '123 Mock Street',
      types: ['restaurant'],
      rating: 4.0,
      user_ratings_total: 100,
      photos: [{photo_reference: 'mockPhotoRefNearby1'}]
    },
    {
      place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY5',
      name: 'Mock Venue 2',
      geometry: { location: { lat: 37.4221, lng: -122.0841 } },
      vicinity: '456 Mock Avenue',
      types: ['cafe'],
      rating: 4.2,
      user_ratings_total: 150,
      photos: [{photo_reference: 'mockPhotoRefNearby2'}]
    }
  ],
  status: 'OK'
};

app.get('/maps/api/place/details/json', (req, res) => {
  console.log(`Mock /maps/api/place/details/json called with query:`, req.query);
  res.json(mockPlaceDetails);
});

app.get('/maps/api/place/nearbysearch/json', (req, res) => {
  console.log(`Mock /maps/api/place/nearbysearch/json called with query:`, req.query);
  res.json(mockNearbySearch);
});

app.get('/maps/api/place/findplacefromtext/json', (req, res) => {
  console.log(`Mock /maps/api/place/findplacefromtext/json called with query:`, req.query);
  res.json({
    candidates: [
      {
        place_id: 'mockPlaceIdFromTextSearch',
        name: 'Mock Place from Text Search',
        formatted_address: '789 Mock Blvd, Mock City',
        geometry: { location: { lat: 37.4220, lng: -122.0840 } },
      }
    ],
    status: 'OK'
  });
});

app.get('/maps/api/geocode/json', (req, res) => {
  console.log(`Mock /maps/api/geocode/json called with query:`, req.query);
  res.json({
    results: [
      {
        place_id: 'mockPlaceIdFromGeocode',
        formatted_address: '123 Main St, Anytown, USA',
        geometry: { location: { lat: 34.0522, lng: -118.2437 } },
        address_components: [
          { long_name: "Anytown", short_name: "Anytown", types: ["locality", "political"] },
          { long_name: "USA", short_name: "US", types: ["country", "political"] }
        ]
      }
    ],
    status: 'OK'
  });
});

// A generic health check endpoint (not affected by simulateNetworkConditions middleware)
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`Mock Google Maps server listening on port ${PORT}`);
  console.log(` - Base latency: ${BASE_LATENCY_MS}ms`);
  console.log(` - Max random additional latency: ${MAX_RANDOM_LATENCY_MS}ms`);
  console.log(` - Error rate: ${ERROR_RATE_PERCENT * 100}%`);
}); 