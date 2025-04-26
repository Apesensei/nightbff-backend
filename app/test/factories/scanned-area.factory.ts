import { faker } from '@faker-js/faker';
import { ScannedArea } from '../../src/microservices/venue/entities/scanned-area.entity';

/**
 * Creates a mock ScannedArea object for testing.
 * @param overrides Optional partial ScannedArea object to override default values.
 * @returns A mock ScannedArea object.
 */
export function createMockScannedArea(overrides?: Partial<ScannedArea>): ScannedArea {
    const defaultScannedArea: ScannedArea = {
        // Generate a plausible geohash prefix (e.g., length 7)
        geohashPrefix: faker.location.nearbyGPSCoordinate({ origin: [40.71, -74.00], radius: 10, isMetric: true}).join('').replace(/[.-]/g, '').substring(0, 7), 
        lastScannedAt: faker.date.recent({ days: 30 }), // Scanned within the last 30 days by default
    };

    return {
        ...defaultScannedArea,
        ...overrides,
    };
}

/**
 * Creates an array of mock ScannedArea objects.
 * @param count The number of mock objects to create.
 * @param overrides Optional partial ScannedArea object to override defaults for all objects.
 * @returns An array of mock ScannedArea objects.
 */
export function createMockScannedAreaList(count: number, overrides?: Partial<ScannedArea>): ScannedArea[] {
    return Array.from({ length: count }, () => createMockScannedArea(overrides));
} 