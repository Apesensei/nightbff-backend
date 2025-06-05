import { faker } from "@faker-js/faker";
import {
  Venue,
  VenueStatus,
} from "../../src/microservices/venue/entities/venue.entity";
// Assuming VenueType, VenueHour etc. factories might exist or be simple mocks for now

/**
 * Creates a mock Venue object for testing.
 * @param overrides Optional partial Venue object to override default values.
 * @returns A mock Venue object.
 */
export function createMockVenue(overrides?: Partial<Venue>): Venue {
  const latitude = faker.location.latitude({ min: -90, max: 90 });
  const longitude = faker.location.longitude({ min: -180, max: 180 });

  const defaultVenue: Venue = {
    id: faker.string.uuid(),
    name: faker.company.name(),
    description: faker.lorem.paragraph(),
    address: faker.location.streetAddress(),
    location: `POINT(${longitude} ${latitude})`, // Generate WKT string
    googlePlaceId: `ChIJ${faker.string.alphanumeric(23)}`, // Mock Google Place ID format
    rating: faker.number.float({ min: 1, max: 5, fractionDigits: 1 }),
    reviewCount: faker.number.int({ min: 0, max: 1000 }),
    popularity: faker.number.int({ min: 0, max: 10000 }),
    priceLevel: faker.number.int({ min: 1, max: 4 }),
    isFeatured: faker.datatype.boolean(),
    status: faker.helpers.enumValue(VenueStatus), // Use imported enum
    website: faker.internet.url(),
    phone: faker.phone.number(),
    isOpenNow: faker.datatype.boolean(),
    adminOverrides: undefined,
    lastModifiedBy: undefined,
    lastModifiedAt: faker.date.recent({ days: 90 }),
    venueTypes: [], // Default to empty array, override if needed
    hours: [], // Default to empty array, override if needed
    events: [], // Default to empty array, override if needed
    reviews: [], // Default to empty array, override if needed
    venuePhotos: [], // Default to empty array, override if needed
    googleRating: faker.number.float({ min: 1, max: 5, fractionDigits: 1 }),
    googleRatingsTotal: faker.number.int({ min: 0, max: 5000 }),
    viewCount: faker.number.int({ min: 0, max: 50000 }),
    followerCount: faker.number.int({ min: 0, max: 1000 }),
    associatedPlanCount: faker.number.int({ min: 0, max: 100 }),
    trendingScore: faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
    isActive: true,
    metadata: { source: "factory" },
    lastRefreshed: faker.date.recent({ days: 180 }), // Default to refreshed relatively recently
    createdAt: faker.date.past({ years: 1 }),
    updatedAt: faker.date.recent({ days: 60 }),
  };

  // Important: TypeORM relations often need to be actual entity instances or just IDs
  // depending on how they are used in tests. Defaulting to empty arrays is safest.

  return {
    ...defaultVenue,
    ...overrides,
  } as Venue; // Use type assertion if needed due to complex relations/types
}

/**
 * Creates an array of mock Venue objects.
 * @param count The number of mock objects to create.
 * @param overrides Optional partial Venue object to override defaults for all objects.
 * @returns An array of mock Venue objects.
 */
export function createMockVenueList(
  count: number,
  overrides?: Partial<Venue>,
): Venue[] {
  return Array.from({ length: count }, () => createMockVenue(overrides));
}
