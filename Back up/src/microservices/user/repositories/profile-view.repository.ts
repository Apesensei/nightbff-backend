import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan, MoreThanOrEqual } from "typeorm";
import { ProfileView } from "../entities/profile-view.entity";

@Injectable()
export class ProfileViewRepository {
  constructor(
    @InjectRepository(ProfileView)
    private readonly repository: Repository<ProfileView>,
  ) {}

  async trackView(
    viewerId: string,
    viewedId: string,
    anonymous: boolean = true,
  ): Promise<ProfileView> {
    const profileView = this.repository.create({
      viewerId,
      viewedId,
      anonymous,
      isNotified: false,
    });

    return this.repository.save(profileView);
  }

  async findById(id: string): Promise<ProfileView | null> {
    return this.repository.findOne({ where: { id } });
  }

  async getViewsForUser(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<[ProfileView[], number]> {
    return this.repository.findAndCount({
      where: { viewedId: userId },
      relations: ["viewer"],
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async countRecentViews(viewedId: string, hours = 24): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hours);

    return this.repository.count({
      where: {
        viewedId,
        createdAt: MoreThanOrEqual(cutoffDate),
      },
    });
  }

  async countUniqueViewersForUser(viewedId: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder("view")
      .select("COUNT(DISTINCT view.viewerId)", "count")
      .where("view.viewedId = :viewedId", { viewedId })
      .getRawOne();

    return parseInt(result.count, 10);
  }

  async getViewsToNotify(): Promise<ProfileView[]> {
    return this.repository.find({
      where: { isNotified: false },
      relations: ["viewer", "viewed"],
      order: { createdAt: "DESC" },
    });
  }

  async markAsNotified(id: string): Promise<void> {
    await this.repository.update(id, { isNotified: true });
  }

  async hasUserViewedProfileWithinTimeframe(
    viewerId: string,
    viewedId: string,
    hours = 24,
  ): Promise<boolean> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hours);

    const count = await this.repository.count({
      where: {
        viewerId,
        viewedId,
        createdAt: MoreThanOrEqual(cutoffDate),
      },
    });

    return count > 0;
  }

  async countViewsByUserToday(viewerId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.repository.count({
      where: {
        viewerId,
        createdAt: MoreThanOrEqual(today),
      },
    });
  }

  async purgeOldViews(olderThanDays = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    await this.repository.delete({
      createdAt: LessThan(cutoffDate),
    });
  }
}
