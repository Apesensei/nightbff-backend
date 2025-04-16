import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "../../auth/entities/user.entity";
import { Repository, DataSource, In } from "typeorm";
// import { Post } from '../../feed/entities/post.entity'; // Removed import - Feed module deleted
import { Interest } from "../entities/interest.entity";
import { UserInterest } from "../entities/user-interest.entity";
import { EventInterest } from "../entities/event-interest.entity";
import { Event } from "../../event/entities/event.entity";

@Injectable()
export class InterestMigrationService {
  private readonly logger = new Logger(InterestMigrationService.name);

  // Mapping table for non-obvious string matches
  private readonly interestNameMapping = new Map<string, string>([
    ["music", "Music"],
    ["sports", "Sports"],
    ["art", "Art"],
    ["gaming", "Gaming"],
    ["hiking", "Hiking"],
    ["dance", "Dancing"], // Example of a non-obvious match
    ["dancing", "Dancing"],
    ["coding", "Programming"], // Example of a non-obvious match
    ["programming", "Programming"],
    // Add more mappings as needed
  ]);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    // @InjectRepository(Post) // Removed injection - Feed module deleted
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(Interest)
    private interestRepository: Repository<Interest>,
    @InjectRepository(UserInterest)
    private userInterestRepository: Repository<UserInterest>,
    @InjectRepository(EventInterest)
    private eventInterestRepository: Repository<EventInterest>,
    private dataSource: DataSource,
  ) {}

  /**
   * Normalize interest strings for matching
   */
  private normalizeInterestString(interest: string): string {
    const lowerInterest = interest.toLowerCase();
    // First check if we have a direct mapping for this string
    if (this.interestNameMapping.has(lowerInterest)) {
      // Use non-null assertion as we've checked `has`
      return this.interestNameMapping.get(lowerInterest)!;
    }

    // Otherwise normalize the string
    return (
      interest
        .trim()
        .toLowerCase()
        // Convert first character to uppercase for consistency
        .replace(/^./, (str) => str.toUpperCase())
    );
  }

  /**
   * Populate the initial set of predefined interests
   */
  async populatePredefinedInterests(
    predefinedInterests: Array<{
      name: string;
      icon: string;
      description?: string;
      isIconEmoji?: boolean;
    }>,
  ): Promise<void> {
    this.logger.log(
      `Starting to populate ${predefinedInterests.length} predefined interests`,
    );

    // Use a transaction to ensure all interests are created atomically
    await this.dataSource.transaction(async (manager) => {
      const interestRepository = manager.getRepository(Interest);

      for (const interestData of predefinedInterests) {
        const normalizedName = this.normalizeInterestString(interestData.name);
        const existingInterest = await interestRepository.findOne({
          where: { name: normalizedName },
        });

        if (!existingInterest) {
          const interest = interestRepository.create({
            name: normalizedName,
            icon: interestData.icon,
            description:
              interestData.description ||
              `Activities related to ${normalizedName}`,
            isIconEmoji:
              interestData.isIconEmoji !== undefined
                ? interestData.isIconEmoji
                : true,
          });

          await interestRepository.save(interest);
          this.logger.log(`Created interest: ${normalizedName}`);
        } else {
          this.logger.log(`Interest already exists: ${normalizedName}`);
        }
      }
    });

    this.logger.log("Finished populating predefined interests");
  }

  /**
   * Migrate user interests from string arrays to entity relationships
   */
  async migrateUserInterests(dryRun = false): Promise<void> {
    this.logger.log("Starting user interests migration");

    // Use a transaction for atomicity
    await this.dataSource.transaction(async (manager) => {
      const userRepository = manager.getRepository(User);
      const interestRepository = manager.getRepository(Interest);
      const userInterestRepository = manager.getRepository(UserInterest);

      // Get all users with interests
      const users = await userRepository.find({
        where: { interests: In([]) },
        select: ["id", "interests"],
      });

      this.logger.log(`Found ${users.length} users with interests to migrate`);

      // Get all available interests from the database
      const allInterests = await interestRepository.find();

      // Create a map for quick lookups
      const interestMap = new Map<string, Interest>();
      allInterests.forEach((interest) => {
        interestMap.set(interest.name.toLowerCase(), interest);
      });

      let createdCount = 0;
      let unmatchedInterests = new Set<string>();

      for (const user of users) {
        if (!user.interests || !Array.isArray(user.interests)) {
          continue;
        }

        for (const interestString of user.interests) {
          const normalizedName = this.normalizeInterestString(interestString);
          const matchedInterest = interestMap.get(normalizedName.toLowerCase());

          if (matchedInterest) {
            if (!dryRun) {
              // Check if relationship already exists
              const existingUserInterest = await userInterestRepository.findOne(
                {
                  where: {
                    userId: user.id,
                    interestId: matchedInterest.id,
                  },
                },
              );

              if (!existingUserInterest) {
                const userInterest = userInterestRepository.create({
                  userId: user.id,
                  interestId: matchedInterest.id,
                });

                await userInterestRepository.save(userInterest);
                createdCount++;
              }
            }
          } else {
            unmatchedInterests.add(interestString);
          }
        }
      }

      this.logger.log(`Created ${createdCount} user-interest relationships`);

      if (unmatchedInterests.size > 0) {
        this.logger.warn(
          `Found ${unmatchedInterests.size} unmatched interests: ${Array.from(unmatchedInterests).join(", ")}`,
        );
      }

      if (!dryRun) {
        // Update user entities to clear the old interests array
        // This is a separate step to ensure we don't lose data if the migration fails
        this.logger.log("Clearing old interests arrays from user entities");
        await userRepository.update({}, { interests: [] });
      }
    });

    this.logger.log("Finished user interests migration");
  }

  /**
   * Migrate event interests (if they exist)
   */
  async migrateEventInterests(): Promise<void> {
    this.logger.log("Starting event interests migration");

    // Commenting out the problematic logic
    /* 
    await this.dataSource.transaction(async (manager) => {
      const eventRepository = manager.getRepository(Event);
      const interestRepository = manager.getRepository(Interest);
      const eventInterestRepository = manager.getRepository(EventInterest);

      // This query will fail as 'interests' does not exist
      const events = await eventRepository.find({
        where: { interests: In([]) }, // Error: 'interests' does not exist
        select: ['id', 'interests'], // Error: 'interests' does not exist
      });
      
      this.logger.log(`Found ${events.length} events with interests to migrate`);

      const allInterests = await interestRepository.find();
      const interestMap = new Map<string, Interest>();
      allInterests.forEach(interest => {
        interestMap.set(interest.name.toLowerCase(), interest);
      });

      let createdCount = 0;
      let unmatchedInterests = new Set<string>();

      for (const event of events) {
        // This access will fail
        if (!event.interests || !Array.isArray(event.interests)) { // Error: 'interests' does not exist
          continue;
        }

        for (const interestString of event.interests) { // Error: 'interests' does not exist
          const normalizedName = this.normalizeInterestString(interestString);
          const matchedInterest = interestMap.get(normalizedName.toLowerCase());

          if (matchedInterest) {
            if (!dryRun) {
              const existingEventInterest = await eventInterestRepository.findOne({
                where: {
                  eventId: event.id,
                  interestId: matchedInterest.id,
                },
              });

              if (!existingEventInterest) {
                const eventInterest = eventInterestRepository.create({
                  eventId: event.id,
                  interestId: matchedInterest.id,
                });
                await eventInterestRepository.save(eventInterest);
                createdCount++;
              }
            }
          } else {
            unmatchedInterests.add(interestString);
          }
        }
      }

      this.logger.log(`Created ${createdCount} event-interest relationships`);

      if (unmatchedInterests.size > 0) {
        this.logger.warn(`Found ${unmatchedInterests.size} unmatched event interests: ${Array.from(unmatchedInterests).join(', ')}`);
      }

      if (!dryRun) {
        this.logger.log('Clearing old interests arrays from event entities');
        // This update will fail
        await eventRepository.update({}, { interests: [] }); // Error: 'interests' does not exist
      }
    });
    */ // Ensure comment block ends correctly
    this.logger.log(
      "Finished event interests migration (Logic currently commented out due to missing 'interests' field on Event entity)",
    );
  }

  /**
   * Run the full migration process
   */
  async runMigration(
    predefinedInterests: Array<{
      name: string;
      icon: string;
      description?: string;
      isIconEmoji?: boolean;
    }>,
    dryRun = false,
  ): Promise<void> {
    this.logger.log(
      `Starting interest data migration ${dryRun ? "(Dry Run)" : ""}`,
    );
    await this.populatePredefinedInterests(predefinedInterests);
    await this.migrateUserInterests(dryRun);
    // await this.migratePostInterests(dryRun); // Removed call - Method deleted
    await this.migrateEventInterests();
    this.logger.log("Finished interest data migration");
  }
}
