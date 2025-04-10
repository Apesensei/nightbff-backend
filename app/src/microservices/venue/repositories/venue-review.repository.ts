import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { VenueReview } from "../entities/venue-review.entity";

@Injectable()
export class VenueReviewRepository {
  constructor(
    @InjectRepository(VenueReview)
    private readonly reviewRepository: Repository<VenueReview>,
  ) {}

  async findById(id: string): Promise<VenueReview> {
    const review = await this.reviewRepository.findOne({
      where: { id },
      relations: ["venue", "user"],
    });

    if (!review) {
      throw new NotFoundException(`Venue review with ID ${id} not found`);
    }

    return review;
  }

  async findByVenueId(
    venueId: string,
    limit?: number,
    offset?: number,
  ): Promise<VenueReview[]> {
    return this.reviewRepository.find({
      where: {
        venueId,
        isPublished: true,
      },
      relations: ["user"],
      order: {
        createdAt: "DESC",
      },
      take: limit,
      skip: offset,
    });
  }

  async findByUserId(userId: string): Promise<VenueReview[]> {
    return this.reviewRepository.find({
      where: {
        userId,
      },
      relations: ["venue"],
      order: {
        createdAt: "DESC",
      },
    });
  }

  async findTopRated(limit: number = 10): Promise<VenueReview[]> {
    return this.reviewRepository.find({
      where: {
        isPublished: true,
        rating: 5,
      },
      relations: ["venue", "user"],
      take: limit,
      order: {
        upvoteCount: "DESC",
        createdAt: "DESC",
      },
    });
  }

  async create(reviewData: Partial<VenueReview>): Promise<VenueReview> {
    const review = this.reviewRepository.create(reviewData);
    return this.reviewRepository.save(review);
  }

  async update(
    id: string,
    reviewData: Partial<VenueReview>,
  ): Promise<VenueReview> {
    const review = await this.findById(id);

    Object.assign(review, reviewData);

    return this.reviewRepository.save(review);
  }

  async delete(id: string): Promise<void> {
    const review = await this.findById(id);
    await this.reviewRepository.remove(review);
  }

  async countByVenueId(venueId: string): Promise<number> {
    return this.reviewRepository.count({
      where: {
        venueId,
        isPublished: true,
      },
    });
  }

  async calculateAverageRating(venueId: string): Promise<number> {
    const result = await this.reviewRepository
      .createQueryBuilder("review")
      .select("AVG(review.rating)", "average")
      .where("review.venueId = :venueId", { venueId })
      .andWhere("review.isPublished = :isPublished", { isPublished: true })
      .getRawOne();

    return result.average ? Number(parseFloat(result.average).toFixed(1)) : 0;
  }

  async incrementUpvote(id: string): Promise<VenueReview> {
    const review = await this.findById(id);

    review.upvoteCount += 1;

    return this.reviewRepository.save(review);
  }

  async incrementDownvote(id: string): Promise<VenueReview> {
    const review = await this.findById(id);

    review.downvoteCount += 1;

    return this.reviewRepository.save(review);
  }
}
