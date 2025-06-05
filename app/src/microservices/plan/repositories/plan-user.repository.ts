import { Injectable, Logger, Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DeleteResult } from "typeorm";
import { PlanUser } from "../entities/plan-user.entity";

@Injectable()
export class PlanUserRepository {
  constructor(
    @InjectRepository(PlanUser)
    private readonly planUserRepository: Repository<PlanUser>,
    @Inject(Logger) private readonly logger: Logger,
  ) {}

  async savePlan(planId: string, userId: string): Promise<PlanUser> {
    this.logger.log(`User ${userId} attempting to save plan ${planId}`);
    const existing = await this.planUserRepository.findOneBy({
      planId,
      userId,
    });

    if (existing) {
      this.logger.warn(`User ${userId} already saved plan ${planId}.`);
      // Option 1: Return existing record
      return existing;
      // Option 2: Throw an error
      // throw new ConflictException('User has already saved this plan.');
    }

    try {
      const newSave = this.planUserRepository.create({ planId, userId });
      const savedRelation = await this.planUserRepository.save(newSave);
      this.logger.log(`User ${userId} successfully saved plan ${planId}.`);
      return savedRelation;
    } catch (error) {
      // Catch potential unique constraint violation if findOneBy check fails due to race condition
      if (error.code === "23505") {
        this.logger.warn(
          `Race condition likely: User ${userId} attempted to save plan ${planId} simultaneously. Returning existing.`,
        );
        const existingAfterError = await this.planUserRepository.findOneBy({
          planId,
          userId,
        });
        if (existingAfterError) return existingAfterError;
        // If it still doesn't exist after error, something else went wrong
      }
      this.logger.error(
        `Failed to save plan ${planId} for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error; // Re-throw other errors
    }
  }

  async unsavePlan(planId: string, userId: string): Promise<DeleteResult> {
    this.logger.log(`User ${userId} attempting to unsave plan ${planId}`);
    const result = await this.planUserRepository.delete({ planId, userId });
    if (result.affected === 0) {
      this.logger.warn(
        `User ${userId} attempted to unsave plan ${planId}, but no existing save record found.`,
      );
    }
    return result;
  }

  async findSavedPlansByUser(userId: string): Promise<PlanUser[]> {
    // Returns the join table records, typically you'd want the Plans themselves
    return this.planUserRepository.find({
      where: { userId },
      relations: ["plan", "plan.city"], // Include Plan and its City if needed downstream
      // Add order by if needed, e.g., order: { createdAt: 'DESC' }
    });
  }

  // Helper to check if a user has saved a specific plan
  async hasUserSavedPlan(planId: string, userId: string): Promise<boolean> {
    const count = await this.planUserRepository.countBy({ planId, userId });
    return count > 0;
  }
}
