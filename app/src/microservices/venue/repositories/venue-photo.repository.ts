import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { VenuePhoto, PhotoSource } from "../entities/venue-photo.entity";

@Injectable()
export class VenuePhotoRepository {
  constructor(
    @InjectRepository(VenuePhoto)
    private readonly photoRepository: Repository<VenuePhoto>,
  ) {}

  async findById(id: string): Promise<VenuePhoto> {
    const photo = await this.photoRepository.findOne({
      where: { id },
      relations: ["venue", "user"],
    });

    if (!photo) {
      throw new NotFoundException(`Venue photo with ID ${id} not found`);
    }

    return photo;
  }

  async findByVenueId(venueId: string): Promise<VenuePhoto[]> {
    return this.photoRepository.find({
      where: {
        venueId,
        isApproved: true,
      },
      order: {
        isPrimary: "DESC",
        order: "ASC",
        createdAt: "DESC",
      },
    });
  }

  async findPrimaryPhoto(venueId: string): Promise<VenuePhoto | null> {
    return this.photoRepository.findOne({
      where: {
        venueId,
        isPrimary: true,
        isApproved: true,
      },
    });
  }

  async findByUserId(userId: string): Promise<VenuePhoto[]> {
    return this.photoRepository.find({
      where: {
        userId,
      },
      relations: ["venue"],
      order: {
        createdAt: "DESC",
      },
    });
  }

  /**
   * Find all photos for a venue including pending approval
   * Admin-only method
   */
  async findAllByVenueId(venueId: string): Promise<VenuePhoto[]> {
    return this.photoRepository.find({
      where: {
        venueId,
      },
      order: {
        isPrimary: "DESC",
        order: "ASC",
        createdAt: "DESC",
      },
    });
  }

  /**
   * Find photos by source (google, admin, user)
   * Admin-only method
   */
  async findBySource(
    venueId: string,
    source: PhotoSource,
  ): Promise<VenuePhoto[]> {
    return this.photoRepository.find({
      where: {
        venueId,
        source,
      },
      order: {
        isPrimary: "DESC",
        order: "ASC",
        createdAt: "DESC",
      },
    });
  }

  /**
   * Approve multiple photos in a batch
   * Admin-only method
   */
  async bulkApprove(photoIds: string[]): Promise<void> {
    await this.photoRepository.update(
      { id: In(photoIds) },
      { isApproved: true },
    );
  }

  /**
   * Update photo order in a batch
   * Admin-only method
   */
  async bulkUpdateOrder(
    orderConfig: Array<{ photoId: string; order: number }>,
  ): Promise<void> {
    // Process each update in a transaction
    for (const config of orderConfig) {
      await this.photoRepository.update(
        { id: config.photoId },
        { order: config.order },
      );
    }
  }

  async create(photoData: Partial<VenuePhoto>): Promise<VenuePhoto> {
    const photo = this.photoRepository.create(photoData);
    return this.photoRepository.save(photo);
  }

  async update(
    id: string,
    photoData: Partial<VenuePhoto>,
  ): Promise<VenuePhoto> {
    const photo = await this.findById(id);
    this.photoRepository.merge(photo, photoData);
    return this.photoRepository.save(photo);
  }

  async delete(id: string): Promise<void> {
    const photo = await this.findById(id);
    await this.photoRepository.remove(photo);
  }

  async setPrimaryPhoto(id: string, venueId: string): Promise<VenuePhoto> {
    // First, unset primary flag for all venue photos
    await this.photoRepository.update({ venueId }, { isPrimary: false });

    // Then set the selected photo as primary
    const photo = await this.findById(id);
    photo.isPrimary = true;

    return this.photoRepository.save(photo);
  }

  async resetPrimaryPhotos(venueId: string): Promise<void> {
    await this.photoRepository.update({ venueId }, { isPrimary: false });
  }

  async approvePhoto(id: string): Promise<VenuePhoto> {
    const photo = await this.findById(id);
    photo.isApproved = true;

    return this.photoRepository.save(photo);
  }

  async rejectPhoto(id: string): Promise<VenuePhoto> {
    const photo = await this.findById(id);
    photo.isApproved = false;

    return this.photoRepository.save(photo);
  }

  async countByVenueId(venueId: string): Promise<number> {
    return this.photoRepository.count({
      where: {
        venueId,
        isApproved: true,
      },
    });
  }

  /**
   * Update image URLs after background processing
   */
  async updateImageUrls(
    id: string,
    imageUrls: {
      thumbnailUrl: string;
      mediumUrl: string;
      largeUrl: string;
    },
  ): Promise<VenuePhoto> {
    const photo = await this.findById(id);
    this.photoRepository.merge(photo, imageUrls);
    return this.photoRepository.save(photo);
  }
}
