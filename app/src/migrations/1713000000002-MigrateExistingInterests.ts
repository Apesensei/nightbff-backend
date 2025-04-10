import { MigrationInterface, QueryRunner, Not, IsNull } from "typeorm";

interface Interest {
  id: string;
  name: string;
}

interface User {
  id: string;
  interests: string[];
}

export class MigrateExistingInterests1713000000002
  implements MigrationInterface
{
  name = "MigrateExistingInterests1713000000002";

  /**
   * Normalize interest string for consistent matching
   */
  private normalizeInterestString(interest: string): string {
    return interest.trim().toLowerCase().replace(/\s+/g, " ");
  }

  /**
   * Get mapping table for non-obvious interest name matches
   */
  private getInterestMapping(): Record<string, string> {
    return {
      backpacker: "Backpacking",
      backpackers: "Backpacking",
      beaches: "Beach",
      beachlife: "Beach",
      budget: "Budget Travel",
      budgeting: "Budget Travel",
      "cheap travel": "Budget Travel",
      camper: "Camping",
      campsite: "Camping",
      cruises: "Cruise",
      cruising: "Cruise",
      digital: "Digital Nomad",
      "remote work": "Digital Nomad",
      scuba: "Diving",
      snorkeling: "Diving",
      hike: "Hiking",
      trekking: "Hiking",
      hostels: "Hostel",
      "train travel": "Interrail",
      expat: "Living Abroad",
      emigration: "Living Abroad",
      luxury: "Luxury Travel",
      "five star": "Luxury Travel",
      outdoors: "Nature",
      wildlife: "Nature",
      nightlife: "Night Life",
      clubbing: "Night Life",
      parties: "Night Life",
      roadtrip: "Road Trip",
      driving: "Road Trip",
      ski: "Skiing",
      snowboarding: "Skiing",
      solo: "Solo Travel",
      "travelling alone": "Solo Travel",
      van: "Van Life",
      vanlife: "Van Life",
      campervan: "Van Life",
      sail: "Sailing",
      boating: "Sailing",
      yacht: "Sailing",
      study: "Study Abroad",
      "student exchange": "Study Abroad",
      surf: "Surfing",
      surfer: "Surfing",
    };
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Wrap the entire migration in a transaction for atomicity
    await queryRunner.startTransaction();

    try {
      // 1. Get all predefined interests
      const interests = (await queryRunner.query(
        `SELECT id, name FROM interests`,
      )) as Interest[];
      console.log(`Found ${interests.length} predefined interests`);

      // 2. Migrate user interests
      // Get all users with interests
      const users = (await queryRunner.query(`
        SELECT id, interests FROM users 
        WHERE interests IS NOT NULL AND array_length(interests, 1) > 0
      `)) as User[];
      console.log(`Found ${users.length} users with interests to migrate`);

      const interestMapping = this.getInterestMapping();

      // Process each user
      for (const user of users) {
        if (!user.interests || user.interests.length === 0) {
          continue;
        }

        // For each user interest, find the matching predefined interest
        for (const interestString of user.interests) {
          // Normalize the interest string
          const normalizedString = this.normalizeInterestString(interestString);

          // Check mapping first
          let matchedInterest: Interest | undefined = undefined;
          const mappedName = interestMapping[normalizedString];

          if (mappedName) {
            matchedInterest = interests.find(
              (i: Interest) => i.name === mappedName,
            );
          }

          // If no match from mapping, try direct match
          if (!matchedInterest) {
            matchedInterest = interests.find(
              (i: Interest) =>
                this.normalizeInterestString(i.name) === normalizedString,
            );
          }

          // If still no match, try partial match
          if (!matchedInterest) {
            matchedInterest = interests.find(
              (i: Interest) =>
                this.normalizeInterestString(i.name).includes(
                  normalizedString,
                ) ||
                normalizedString.includes(this.normalizeInterestString(i.name)),
            );
          }

          // Insert user interest relation if match found
          if (matchedInterest) {
            // Check if relation already exists to avoid duplicates
            const existingRelation = await queryRunner.query(
              `
              SELECT id FROM user_interests 
              WHERE user_id = $1 AND interest_id = $2
            `,
              [user.id, matchedInterest.id],
            );

            if (existingRelation.length === 0) {
              await queryRunner.query(
                `
                INSERT INTO user_interests (id, user_id, interest_id, created_at)
                VALUES (uuid_generate_v4(), $1, $2, CURRENT_TIMESTAMP)
              `,
                [user.id, matchedInterest.id],
              );
              console.log(
                `Migrated user interest: ${user.id} -> ${interestString} -> ${matchedInterest.name}`,
              );
            }
          } else {
            console.warn(`No matching interest found for "${interestString}"`);
          }
        }
      }

      // Commit the transaction
      await queryRunner.commitTransaction();
      console.log(
        "Interest migration (excluding posts) completed successfully",
      );
    } catch (error) {
      // If any operation fails, roll back the entire transaction
      await queryRunner.rollbackTransaction();
      console.error("Interest migration failed:", error);
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No need to implement rollback for data migration
    console.log(
      "Note: Data migration rollback not implemented. Manual intervention required.",
    );
  }
}
