import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  Repository,
  FindOneOptions,
  UpdateResult,
  DeleteResult,
} from "typeorm";
import { Plan } from "../entities/plan.entity";

// Define basic pagination options interface
interface PaginationOptions {
  limit?: number;
  offset?: number;
}

@Injectable()
export class PlanRepository {
  private readonly logger = new Logger(PlanRepository.name);

  constructor(
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
  ) {}

  async create(planData: Partial<Plan>): Promise<Plan> {
    const plan = this.planRepository.create(planData);
    return this.planRepository.save(plan);
  }

  async findOneById(
    id: string,
    options?: FindOneOptions<Plan>,
  ): Promise<Plan | null> {
    return this.planRepository.findOne({ ...options, where: { id } });
  }

  async findByCityId(
    cityId: string,
    options: PaginationOptions = {},
  ): Promise<[Plan[], number]> {
    const { limit = 10, offset = 0 } = options;
    return this.planRepository.findAndCount({
      where: { cityId },
      relations: ["city"], // Include city data based on entity relation
      order: { createdAt: "DESC" },
      take: limit,
      skip: offset,
    });
  }

  // Note: This requires PlanUser table/repo to link plans to savers
  // This implementation might change depending on how saves are tracked
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async findSavedPlansByUser(userId: string): Promise<Plan[]> {
    // This likely requires a join with PlanUser table
    // Placeholder: Implement actual query based on PlanUser relation
    this.logger.warn(
      "findSavedPlansByUser needs implementation based on PlanUser relation",
    );
    // Example structure (adjust based on final relations):
    // return this.planRepository.createQueryBuilder('plan')
    //   .innerJoin('plan.planUsers', 'planUser', 'planUser.userId = :userId', { userId })
    //   .getMany();
    return [];
  }

  async incrementSaveCount(
    planId: string,
    amount: number,
  ): Promise<UpdateResult> {
    return this.planRepository.increment({ id: planId }, "saveCount", amount);
  }

  async incrementViewCount(
    planId: string,
    amount: number,
  ): Promise<UpdateResult> {
    return this.planRepository.increment({ id: planId }, "viewCount", amount);
  }

  async update(id: string, updateData: Partial<Plan>): Promise<UpdateResult> {
    return this.planRepository.update({ id }, updateData);
  }

  async delete(id: string): Promise<DeleteResult> {
    // Plan entity does not have @DeleteDateColumn, use hard delete.
    return this.planRepository.delete({ id });
  }
}
