import { Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Logger } from "@nestjs/common";

import { InterestRepository } from "../repositories/interest.repository";
import {
  InterestResponseDto,
  CreateInterestDto,
  UpdateInterestDto,
  PaginatedInterestResponseDto,
} from "../dto";

@Injectable()
export class InterestService {
  private readonly logger = new Logger(InterestService.name);

  constructor(
    private readonly interestRepository: InterestRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Get all interests with optional filtering and pagination
   */
  async getAllInterests(
    paginationOptions: { page: number; limit: number },
    filterOptions: { search?: string; onlyActive?: boolean },
  ): Promise<PaginatedInterestResponseDto> {
    const { page, limit } = paginationOptions;
    const { search, onlyActive = true } = filterOptions;

    const offset = (page - 1) * limit;

    const [interests, total] = await this.interestRepository.findAll({
      isActive: onlyActive,
      limit,
      offset,
      search,
    });

    const items = interests.map((interest) =>
      InterestResponseDto.fromEntity(interest),
    );
    const totalPages = Math.ceil(total / limit);

    return {
      interests: items,
      totalCount: total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * Get interest by ID
   */
  async getInterestById(id: string): Promise<InterestResponseDto> {
    const interest = await this.interestRepository.findById(id);
    return InterestResponseDto.fromEntity(interest);
  }

  /**
   * Get interests for a user
   */
  async getUserInterests(userId: string): Promise<InterestResponseDto[]> {
    const userInterests =
      await this.interestRepository.findUserInterests(userId);

    return userInterests
      .filter((ui) => ui.interest && ui.interest.isActive)
      .map((ui) => InterestResponseDto.fromEntity(ui.interest));
  }

  /**
   * Get interests for an event
   */
  async getEventInterests(eventId: string): Promise<InterestResponseDto[]> {
    const eventInterests =
      await this.interestRepository.findEventInterests(eventId);

    return eventInterests
      .filter((ei) => ei.interest && ei.interest.isActive)
      .map((ei) => InterestResponseDto.fromEntity(ei.interest));
  }

  /**
   * Update user interests
   */
  async updateUserInterests(
    userId: string,
    interestIds: string[],
  ): Promise<void> {
    // Validate interest IDs if any are provided
    if (interestIds.length > 0) {
      await this.validateInterestIds(interestIds);
    }

    // Update user interests
    await this.interestRepository.updateUserInterests(userId, interestIds);

    // Emit event for analytics
    this.eventEmitter.emit("user.interests.updated", {
      userId,
      interestIds,
      timestamp: new Date(),
    });

    this.logger.log(`Updated interests for user ${userId}`);
  }

  /**
   * Update event interests
   */
  async updateEventInterests(
    eventId: string,
    interestIds: string[],
  ): Promise<void> {
    // Validate interest IDs if any are provided
    if (interestIds.length > 0) {
      await this.validateInterestIds(interestIds);
    }

    // Update event interests
    await this.interestRepository.updateEventInterests(eventId, interestIds);

    // Emit event for analytics
    this.eventEmitter.emit("event.interests.updated", {
      eventId,
      interestIds,
      timestamp: new Date(),
    });

    this.logger.log(`Updated interests for event ${eventId}`);
  }

  /**
   * Get trending interests
   */
  async getTrendingInterests(
    limit: number = 10,
  ): Promise<InterestResponseDto[]> {
    const interests = await this.interestRepository.getTrendingInterests(limit);
    return interests.map((interest) =>
      InterestResponseDto.fromEntity(interest),
    );
  }

  /**
   * Get popular interests based on usage
   */
  async getPopularInterests(
    limit: number = 10,
  ): Promise<InterestResponseDto[]> {
    const interests = await this.interestRepository.getPopularInterests(limit);
    return interests.map((interest) =>
      InterestResponseDto.fromEntity(interest),
    );
  }

  /**
   * Get recommended interests for a user based on their existing interests and patterns
   */
  async getRecommendedInterests(
    userId: string,
    limit: number = 10,
  ): Promise<InterestResponseDto[]> {
    // Get user's current interests
    const userInterests =
      await this.interestRepository.findUserInterests(userId);
    const userInterestIds = userInterests.map((ui) => ui.interestId);

    // If user has no interests, return popular interests instead
    if (userInterestIds.length === 0) {
      return this.getPopularInterests(limit);
    }

    // Get related interests based on common selections by other users
    const relatedInterests = await this.interestRepository.getRelatedInterests(
      userInterestIds,
      limit,
    );

    // Filter out interests the user already has
    const filteredInterests = relatedInterests.filter(
      (interest) => !userInterestIds.includes(interest.id),
    );

    // If we don't have enough related interests, supplement with popular ones
    if (filteredInterests.length < limit) {
      const popularInterests =
        await this.interestRepository.getPopularInterests(limit * 2);
      const remainingNeeded = limit - filteredInterests.length;

      // Filter out interests already in the list or user already has
      const additionalInterests = popularInterests
        .filter(
          (interest) =>
            !userInterestIds.includes(interest.id) &&
            !filteredInterests.some((ri) => ri.id === interest.id),
        )
        .slice(0, remainingNeeded);

      filteredInterests.push(...additionalInterests);
    }

    return filteredInterests.map((interest) =>
      InterestResponseDto.fromEntity(interest),
    );
  }

  /**
   * Get analytics data about interest usage
   */
  async getInterestAnalytics(): Promise<{
    topInterests: Array<{ id: string; name: string; count: number }>;
    totalUsageCount: number;
    lastUpdated: Date;
  }> {
    const analytics = await this.interestRepository.getInterestAnalytics();

    // Extract IDs and fetch corresponding Interest entities to get names
    const topInterestIds = analytics.topInterests.map((item) => item.id);
    let interestNameMap = new Map<string, string>();

    if (topInterestIds.length > 0) {
      const topInterestEntities =
        await this.interestRepository.findByIds(topInterestIds);
      interestNameMap = new Map(
        topInterestEntities.map((interest) => [interest.id, interest.name]),
      );
    }

    // Format the response using the name map
    return {
      topInterests: analytics.topInterests.map((item) => ({
        id: item.id,
        name: interestNameMap.get(item.id) || "Unknown Interest", // Get name from map
        count: item.count,
      })),
      totalUsageCount: analytics.totalUsageCount,
      lastUpdated: analytics.updatedAt,
    };
  }

  /**
   * Update sort order of interests based on array of IDs
   * The position in the array determines the sort order
   */
  async updateInterestsSortOrder(interestIds: string[]): Promise<void> {
    // Validate that all interest IDs exist
    await this.validateInterestIds(interestIds);

    // Update sort order for each interest
    await this.interestRepository.updateSortOrder(interestIds);

    // Emit event for analytics
    this.eventEmitter.emit("interests.sort-order.updated", {
      interestIds,
      timestamp: new Date(),
    });

    this.logger.log(`Updated sort order for ${interestIds.length} interests`);
  }

  /**
   * Create a new interest (admin only)
   */
  async createInterest(
    createInterestDto: CreateInterestDto,
  ): Promise<InterestResponseDto> {
    const interest = await this.interestRepository.create(createInterestDto);

    // Emit event for analytics
    this.eventEmitter.emit("interest.created", {
      interestId: interest.id,
      name: interest.name,
      timestamp: new Date(),
    });

    return InterestResponseDto.fromEntity(interest);
  }

  /**
   * Update an interest (admin only)
   */
  async updateInterest(
    id: string,
    updateInterestDto: UpdateInterestDto,
  ): Promise<InterestResponseDto> {
    const interest = await this.interestRepository.update(
      id,
      updateInterestDto,
    );

    // Emit event for analytics
    this.eventEmitter.emit("interest.updated", {
      interestId: id,
      updates: updateInterestDto,
      timestamp: new Date(),
    });

    return InterestResponseDto.fromEntity(interest);
  }

  /**
   * Delete an interest (admin only)
   */
  async deleteInterest(id: string): Promise<boolean> {
    try {
      await this.interestRepository.remove(id);

      // Emit event for analytics
      this.eventEmitter.emit("interest.deleted", {
        interestId: id,
        timestamp: new Date(),
      });

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to delete interest ${id}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Validate that all interest IDs exist
   */
  private async validateInterestIds(interestIds: string[]): Promise<void> {
    if (!interestIds.length) {
      return;
    }

    const interests = await this.interestRepository.findByIds(interestIds);

    // Check if all interests exist and are active
    const foundIds = new Set(interests.map((interest) => interest.id));
    const invalidIds = interestIds.filter((id) => !foundIds.has(id));

    if (invalidIds.length > 0) {
      throw new NotFoundException(
        `The following interests were not found: ${invalidIds.join(", ")}`,
      );
    }

    // Check if any interests are inactive
    const inactiveInterests = interests.filter(
      (interest) => !interest.isActive,
    );
    if (inactiveInterests.length > 0) {
      throw new NotFoundException(
        `The following interests are inactive: ${inactiveInterests.map((i) => i.name).join(", ")}`,
      );
    }
  }
}
