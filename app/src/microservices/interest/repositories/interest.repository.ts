import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  Repository,
  FindOptionsWhere,
  In,
  Not,
  MoreThan,
  FindOptionsOrder,
  ILike,
} from "typeorm";
import { Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "@nestjs/cache-manager";
import { Logger } from "@nestjs/common";
import {
  InterestAnalyticsData,
  InterestPopularityRecord,
} from "../interfaces/interest.interface";

import { Interest } from "../entities/interest.entity";
import { UserInterest } from "../entities/user-interest.entity";
import { EventInterest } from "../entities/event-interest.entity";
import { CreateInterestDto } from "../dto/create-interest.dto";
import { UpdateInterestDto } from "../dto/update-interest.dto";

export interface FindInterestsOptions {
  isActive?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: "name" | "sortOrder" | "usageCount";
  order?: "ASC" | "DESC";
  search?: string;
}

@Injectable()
export class InterestRepository {
  private readonly logger = new Logger(InterestRepository.name);
  private readonly DEFAULT_CACHE_TTL = 3600; // 1 hour in seconds

  constructor(
    @InjectRepository(Interest)
    private readonly interestRepository: Repository<Interest>,
    @InjectRepository(UserInterest)
    private readonly userInterestRepository: Repository<UserInterest>,
    @InjectRepository(EventInterest)
    private readonly eventInterestRepository: Repository<EventInterest>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Find all interests with optional filtering and pagination
   */
  async findAll(
    options: FindInterestsOptions = {},
  ): Promise<[Interest[], number]> {
    const {
      isActive = true,
      limit = 50,
      offset = 0,
      orderBy = "sortOrder",
      order = "ASC",
      search,
    } = options;

    // Generate cache key
    const cacheKey = `interests:all:${JSON.stringify(options)}`;
    const cachedResult =
      await this.cacheManager.get<[Interest[], number]>(cacheKey);

    if (cachedResult) {
      return cachedResult;
    }

    // Build query
    const where: FindOptionsWhere<Interest> = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.name = ILike(`%${search}%`);
    }

    const orderOptions: FindOptionsOrder<Interest> = {};
    orderOptions[orderBy] = order;

    // Execute query
    const [interests, count] = await this.interestRepository.findAndCount({
      where,
      order: orderOptions,
      skip: offset,
      take: limit,
    });

    // Cache result
    await this.cacheManager.set(
      cacheKey,
      [interests, count],
      this.DEFAULT_CACHE_TTL * 1000,
    );

    return [interests, count];
  }

  /**
   * Find interest by ID
   */
  async findById(id: string): Promise<Interest> {
    const cacheKey = `interests:${id}`;
    const cachedInterest = await this.cacheManager.get<Interest>(cacheKey);

    if (cachedInterest) {
      return cachedInterest;
    }

    const interest = await this.interestRepository.findOne({ where: { id } });

    if (!interest) {
      throw new NotFoundException(`Interest with ID ${id} not found`);
    }

    await this.cacheManager.set(
      cacheKey,
      interest,
      this.DEFAULT_CACHE_TTL * 1000,
    );

    return interest;
  }

  /**
   * Find multiple interests by IDs
   */
  async findByIds(ids: string[]): Promise<Interest[]> {
    const cacheKey = `interests:multiple:${ids.sort().join(",")}`;
    const cachedInterests = await this.cacheManager.get<Interest[]>(cacheKey);

    if (cachedInterests) {
      return cachedInterests;
    }

    const interests = await this.interestRepository.find({
      where: { id: In(ids) },
    });

    await this.cacheManager.set(
      cacheKey,
      interests,
      this.DEFAULT_CACHE_TTL * 1000,
    );

    return interests;
  }

  /**
   * Find interests for a user
   */
  async findUserInterests(userId: string): Promise<UserInterest[]> {
    const cacheKey = `user:${userId}:interests`;
    const cachedUserInterests =
      await this.cacheManager.get<UserInterest[]>(cacheKey);

    if (cachedUserInterests) {
      return cachedUserInterests;
    }

    const userInterests = await this.userInterestRepository.find({
      where: { userId },
      relations: ["interest"],
    });

    await this.cacheManager.set(
      cacheKey,
      userInterests,
      this.DEFAULT_CACHE_TTL * 1000,
    );

    return userInterests;
  }

  /**
   * Find interests for an event
   */
  async findEventInterests(eventId: string): Promise<EventInterest[]> {
    const cacheKey = `event:${eventId}:interests`;
    const cachedEventInterests =
      await this.cacheManager.get<EventInterest[]>(cacheKey);

    if (cachedEventInterests) {
      return cachedEventInterests;
    }

    const eventInterests = await this.eventInterestRepository.find({
      where: { eventId },
      relations: ["interest"],
    });

    await this.cacheManager.set(
      cacheKey,
      eventInterests,
      this.DEFAULT_CACHE_TTL * 1000,
    );

    return eventInterests;
  }

  /**
   * NEW: Find event IDs associated with a specific interest ID
   */
  async findEventIdsByInterest(interestId: string): Promise<string[]> {
    if (!interestId) {
      return [];
    }
    const eventInterests = await this.eventInterestRepository.find({
      select: ["eventId"], // Select only the eventId column
      where: { interestId: interestId },
      cache: true, // Consider caching if appropriate
    });
    // Return unique eventIds
    return [...new Set(eventInterests.map((ei) => ei.eventId))];
  }

  /**
   * Get trending interests based on recent activity
   */
  async getTrendingInterests(limit: number = 10): Promise<Interest[]> {
    const cacheKey = `interests:trending:${limit}`;
    const cachedTrending = await this.cacheManager.get<Interest[]>(cacheKey);

    if (cachedTrending) {
      return cachedTrending;
    }

    // Query for trending interests - those with highest usage in the last period
    const interests = await this.interestRepository.find({
      where: {
        isActive: true,
        usageCount: MoreThan(0),
      },
      order: {
        usageCount: "DESC",
      },
      take: limit,
    });

    await this.cacheManager.set(
      cacheKey,
      interests,
      this.DEFAULT_CACHE_TTL * 1000,
    );

    return interests;
  }

  /**
   * Get popular interests based on overall usage
   */
  async getPopularInterests(limit: number = 10): Promise<Interest[]> {
    const cacheKey = `interests:popular:${limit}`;
    const cachedPopular = await this.cacheManager.get<Interest[]>(cacheKey);

    if (cachedPopular) {
      return cachedPopular;
    }

    // Query for popular interests by overall usage count
    const interests = await this.interestRepository.find({
      where: {
        isActive: true,
      },
      order: {
        usageCount: "DESC",
      },
      take: limit,
    });

    await this.cacheManager.set(
      cacheKey,
      interests,
      this.DEFAULT_CACHE_TTL * 1000,
    );

    return interests;
  }

  /**
   * Get related interests based on common user selections
   */
  async getRelatedInterests(
    interestIds: string[],
    limit: number = 10,
  ): Promise<Interest[]> {
    const cacheKey = `interests:related:${interestIds.sort().join(",")}:${limit}`;
    const cachedRelated = await this.cacheManager.get<Interest[]>(cacheKey);

    if (cachedRelated) {
      return cachedRelated;
    }

    // Find users who have selected the given interests
    const userInterests = await this.userInterestRepository.find({
      where: {
        interestId: In(interestIds),
      },
      select: ["userId"],
    });

    const userIds = [...new Set(userInterests.map((ui) => ui.userId))];

    if (userIds.length === 0) {
      return this.getPopularInterests(limit);
    }

    // Find other interests that these users have selected
    const otherUserInterests = await this.userInterestRepository.find({
      where: {
        userId: In(userIds),
        interestId: Not(In(interestIds)),
      },
      relations: ["interest"],
    });

    // Count occurrences of each interest
    const interestCounts = new Map<
      string,
      { interest: Interest; count: number }
    >();

    otherUserInterests.forEach((ui) => {
      if (!ui.interest || !ui.interest.isActive) return;

      const current = interestCounts.get(ui.interestId) || {
        interest: ui.interest,
        count: 0,
      };
      current.count += 1;
      interestCounts.set(ui.interestId, current);
    });

    // Sort by count and take top N
    const relatedInterests = Array.from(interestCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map((item) => item.interest);

    await this.cacheManager.set(
      cacheKey,
      relatedInterests,
      this.DEFAULT_CACHE_TTL * 1000,
    );

    return relatedInterests;
  }

  /**
   * Update user interests
   */
  async updateUserInterests(
    userId: string,
    interestIds: string[],
  ): Promise<void> {
    // Delete existing user interests
    await this.userInterestRepository.delete({ userId });

    if (interestIds.length === 0) {
      await this.clearUserInterestsCache(userId);
      return;
    }

    // Create new user interests
    const userInterests = interestIds.map((interestId) => ({
      userId,
      interestId,
    }));

    await this.userInterestRepository.insert(userInterests);

    // Clear cache
    await this.clearUserInterestsCache(userId);
  }

  /**
   * Update event interests
   */
  async updateEventInterests(
    eventId: string,
    interestIds: string[],
  ): Promise<void> {
    // Delete existing event interests
    await this.eventInterestRepository.delete({ eventId });

    if (interestIds.length === 0) {
      await this.clearEventInterestsCache(eventId);
      return;
    }

    // Create new event interests
    const eventInterests = interestIds.map((interestId) => ({
      eventId,
      interestId,
    }));

    await this.eventInterestRepository.insert(eventInterests);

    // Clear cache
    await this.clearEventInterestsCache(eventId);
  }

  /**
   * Create a new interest
   */
  async create(createInterestDto: CreateInterestDto): Promise<Interest> {
    const interest = this.interestRepository.create(createInterestDto);
    const saved = await this.interestRepository.save(interest);

    await this.clearInterestsCache();

    return saved;
  }

  /**
   * Update an existing interest
   */
  async update(
    id: string,
    updateInterestDto: UpdateInterestDto,
  ): Promise<Interest> {
    await this.interestRepository.update(id, updateInterestDto);

    const updatedInterest = await this.interestRepository.findOne({
      where: { id },
    });

    if (!updatedInterest) {
      throw new NotFoundException(`Interest with ID ${id} not found`);
    }

    await this.clearInterestsCache();
    await this.clearInterestCache(id);

    return updatedInterest;
  }

  /**
   * Remove an interest
   */
  async remove(id: string): Promise<void> {
    const result = await this.interestRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Interest with ID ${id} not found`);
    }

    await this.clearInterestsCache();
    await this.clearInterestCache(id);
  }

  /**
   * Update interest usage metrics
   */
  async updateUsageMetrics(usageData: Record<string, number>): Promise<void> {
    for (const [interestId, count] of Object.entries(usageData)) {
      if (count > 0) {
        await this.interestRepository.increment(
          { id: interestId },
          "usageCount",
          count,
        );
      }
    }

    await this.clearInterestsCache();
  }

  /**
   * Update sort order of interests based on array position
   */
  async updateSortOrder(interestIds: string[]): Promise<void> {
    // Update each interest with its position in the array as the sort order
    for (let i = 0; i < interestIds.length; i++) {
      await this.interestRepository.update(interestIds[i], { sortOrder: i });
    }

    await this.clearInterestsCache();
  }

  /**
   * Get interest usage analytics
   */
  async getInterestAnalytics(): Promise<InterestAnalyticsData> {
    const cacheKey = "interests:analytics";
    const cachedAnalytics =
      await this.cacheManager.get<InterestAnalyticsData>(cacheKey);

    if (cachedAnalytics) {
      return cachedAnalytics;
    }

    // Get interests with usage count
    const interests = await this.interestRepository.find({
      order: {
        usageCount: "DESC",
      },
    });

    // Calculate total usage count
    const totalUsageCount = interests.reduce(
      (sum, interest) => sum + interest.usageCount,
      0,
    );

    // Map to analytics format
    const topInterests: InterestPopularityRecord[] = interests
      .filter((interest) => interest.usageCount > 0)
      .map((interest) => ({
        id: interest.id,
        name: interest.name,
        count: interest.usageCount,
      }));

    const analytics: InterestAnalyticsData = {
      topInterests,
      totalUsageCount,
      updatedAt: new Date(),
    };

    await this.cacheManager.set(
      cacheKey,
      analytics,
      this.DEFAULT_CACHE_TTL * 1000,
    );

    return analytics;
  }

  /**
   * Clear all interests cache
   */
  private async clearInterestsCache(): Promise<void> {
    const keys = [
      "interests:all:*",
      "interests:trending:*",
      "interests:popular:*",
      "interests:related:*",
      "interests:analytics",
    ];

    for (const key of keys) {
      try {
        await this.cacheManager.del(key);
      } catch (error) {
        this.logger.warn(
          `Failed to clear cache for key pattern ${key}: ${error.message}`,
        );
      }
    }
  }

  /**
   * Clear specific interest cache
   */
  private async clearInterestCache(interestId: string): Promise<void> {
    await this.cacheManager.del(`interests:${interestId}`);
  }

  /**
   * Clear user interests cache
   */
  private async clearUserInterestsCache(userId: string): Promise<void> {
    await this.cacheManager.del(`user:${userId}:interests`);
  }

  /**
   * Clear event interests cache
   */
  private async clearEventInterestsCache(eventId: string): Promise<void> {
    await this.cacheManager.del(`event:${eventId}:interests`);
  }
}
