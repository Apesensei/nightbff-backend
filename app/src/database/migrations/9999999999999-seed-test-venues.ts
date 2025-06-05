import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedTestVenues9999999999999 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert test venues for performance testing
    await queryRunner.query(`
      INSERT INTO venues (
        id, name, description, address, location, 
        rating, "reviewCount", popularity, "priceLevel", "isFeatured", status,
        "trendingScore", "createdAt", "updatedAt"
      ) VALUES 
      (
        uuid_generate_v4(), 'The Grand Nightclub', 'Premier nightlife destination in downtown',
        '123 Main St, San Francisco, CA 94102',
        ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326),
        4.5, 150, 85, 3, true, 'active',
        95.5, NOW(), NOW()
      ),
      (
        uuid_generate_v4(), 'Rooftop Lounge', 'Upscale rooftop bar with city views',
        '456 Market St, San Francisco, CA 94105',
        ST_SetSRID(ST_MakePoint(-122.4094, 37.7849), 4326),
        4.2, 89, 72, 4, false, 'active',
        78.3, NOW(), NOW()
      ),
      (
        uuid_generate_v4(), 'Underground Club', 'Electronic music venue with top DJs',
        '789 Mission St, San Francisco, CA 94103',
        ST_SetSRID(ST_MakePoint(-122.4294, 37.7649), 4326),
        4.7, 203, 92, 2, true, 'active',
        88.7, NOW(), NOW()
      ),
      (
        uuid_generate_v4(), 'Cocktail Bar & Grill', 'Craft cocktails and gourmet dining',
        '321 Union St, San Francisco, CA 94133',
        ST_SetSRID(ST_MakePoint(-122.3994, 37.7949), 4326),
        4.0, 67, 58, 3, false, 'active',
        65.2, NOW(), NOW()
      ),
      (
        uuid_generate_v4(), 'Sports Bar Central', 'Sports viewing with craft beer selection',
        '654 Folsom St, San Francisco, CA 94107',
        ST_SetSRID(ST_MakePoint(-122.4394, 37.7549), 4326),
        3.8, 124, 45, 2, false, 'active',
        52.1, NOW(), NOW()
      ),
      (
        uuid_generate_v4(), 'Wine & Tapas', 'European-style wine bar with small plates',
        '987 Valencia St, San Francisco, CA 94110',
        ST_SetSRID(ST_MakePoint(-122.4494, 37.7449), 4326),
        4.3, 98, 63, 3, false, 'active',
        71.8, NOW(), NOW()
      ),
      (
        uuid_generate_v4(), 'Dance Floor Paradise', 'Multi-level dance club with live music',
        '147 Geary St, San Francisco, CA 94108',
        ST_SetSRID(ST_MakePoint(-122.4079, 37.7879), 4326),
        4.6, 187, 89, 3, true, 'active',
        91.4, NOW(), NOW()
      ),
      (
        uuid_generate_v4(), 'Brewery & Pub', 'Local craft brewery with food trucks',
        '258 3rd St, San Francisco, CA 94107',
        ST_SetSRID(ST_MakePoint(-122.3989, 37.7819), 4326),
        4.1, 156, 67, 2, false, 'active',
        69.3, NOW(), NOW()
      ),
      (
        uuid_generate_v4(), 'Jazz & Blues Club', 'Intimate venue featuring live jazz performances',
        '369 Fillmore St, San Francisco, CA 94117',
        ST_SetSRID(ST_MakePoint(-122.4319, 37.7719), 4326),
        4.4, 142, 76, 3, false, 'active',
        82.6, NOW(), NOW()
      ),
      (
        uuid_generate_v4(), 'Karaoke Palace', 'Private karaoke rooms and full bar service',
        '741 Irving St, San Francisco, CA 94122',
        ST_SetSRID(ST_MakePoint(-122.4639, 37.7639), 4326),
        3.9, 93, 41, 2, false, 'active',
        48.7, NOW(), NOW()
      );
    `);

    console.log("✅ Seeded 10 test venues for performance testing");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove test venues by name pattern since IDs are auto-generated
    await queryRunner.query(`
      DELETE FROM venues WHERE name IN (
        'The Grand Nightclub', 'Rooftop Lounge', 'Underground Club', 
        'Cocktail Bar & Grill', 'Sports Bar Central', 'Wine & Tapas',
        'Dance Floor Paradise', 'Brewery & Pub', 'Jazz & Blues Club', 
        'Karaoke Palace'
      );
    `);

    console.log("✅ Removed test venue data");
  }
}
