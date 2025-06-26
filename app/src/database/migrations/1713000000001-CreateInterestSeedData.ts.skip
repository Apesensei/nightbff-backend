import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInterestSeedData1713000000001 implements MigrationInterface {
  name = "CreateInterestSeedData1713000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert predefined interests
    const predefinedInterests = [
      { name: "Adventure", icon: "🧗", is_icon_emoji: true, sort_order: 1 },
      { name: "Au Pair", icon: "🌍", is_icon_emoji: true, sort_order: 2 },
      { name: "Backpacking", icon: "🎒", is_icon_emoji: true, sort_order: 3 },
      { name: "Beach", icon: "🏖️", is_icon_emoji: true, sort_order: 4 },
      { name: "Budget Travel", icon: "💵", is_icon_emoji: true, sort_order: 5 },
      { name: "Camping", icon: "⛺", is_icon_emoji: true, sort_order: 6 },
      { name: "Cruise", icon: "🚢", is_icon_emoji: true, sort_order: 7 },
      { name: "Digital Nomad", icon: "💻", is_icon_emoji: true, sort_order: 8 },
      { name: "Diving", icon: "🤿", is_icon_emoji: true, sort_order: 9 },
      { name: "Hiking", icon: "👢", is_icon_emoji: true, sort_order: 10 },
      { name: "Hostel", icon: "🛏️", is_icon_emoji: true, sort_order: 11 },
      { name: "Interrail", icon: "🚆", is_icon_emoji: true, sort_order: 12 },
      {
        name: "Living Abroad",
        icon: "🧳",
        is_icon_emoji: true,
        sort_order: 13,
      },
      {
        name: "Luxury Travel",
        icon: "🍸",
        is_icon_emoji: true,
        sort_order: 14,
      },
      { name: "Nature", icon: "🌿", is_icon_emoji: true, sort_order: 15 },
      { name: "Night Life", icon: "🪩", is_icon_emoji: true, sort_order: 16 },
      { name: "Road Trip", icon: "🚗", is_icon_emoji: true, sort_order: 17 },
      { name: "Skiing", icon: "⛷️", is_icon_emoji: true, sort_order: 18 },
      { name: "Solo Travel", icon: "🏞️", is_icon_emoji: true, sort_order: 19 },
      { name: "Van Life", icon: "🚐", is_icon_emoji: true, sort_order: 20 },
      { name: "Sailing", icon: "⛵", is_icon_emoji: true, sort_order: 21 },
      { name: "Study Abroad", icon: "📚", is_icon_emoji: true, sort_order: 22 },
      { name: "Surfing", icon: "🏄", is_icon_emoji: true, sort_order: 23 },
    ];

    // Insert each interest
    for (const interest of predefinedInterests) {
      await queryRunner.query(
        `
        INSERT INTO interests (id, name, icon, is_icon_emoji, sort_order, created_at, updated_at)
        VALUES (uuid_generate_v4(), $1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
        [
          interest.name,
          interest.icon,
          interest.is_icon_emoji,
          interest.sort_order,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Clear all seed data
    await queryRunner.query(`DELETE FROM interests WHERE name IN (
      'Adventure', 'Au Pair', 'Backpacking', 'Beach', 'Budget Travel', 
      'Camping', 'Cruise', 'Digital Nomad', 'Diving', 'Hiking', 
      'Hostel', 'Interrail', 'Living Abroad', 'Luxury Travel', 'Nature', 
      'Night Life', 'Road Trip', 'Skiing', 'Solo Travel', 'Van Life', 
      'Sailing', 'Study Abroad', 'Surfing'
    )`);
  }
}
