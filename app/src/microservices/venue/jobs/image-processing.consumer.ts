import { Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import { Logger } from "@nestjs/common";
import {
  ImageProcessingService,
  ImageProcessingJobData,
  ImageSizes,
} from "../services/image-processing.service";
import { VenuePhotoRepository } from "../repositories/venue-photo.repository";

@Processor("image-processing")
export class ImageProcessingConsumer {
  private readonly logger = new Logger(ImageProcessingConsumer.name);

  constructor(
    private readonly imageProcessingService: ImageProcessingService,
    private readonly venuePhotoRepository: VenuePhotoRepository,
  ) {}

  @Process("process-images")
  async processImages(job: Job<ImageProcessingJobData>): Promise<ImageSizes> {
    const { data } = job;

    this.logger.log(
      `Processing image job ${job.id} for file: ${data.fileName}`,
    );

    try {
      // Process the images
      const result =
        await this.imageProcessingService.processImagesSynchronously(data);

      this.logger.log(
        `Successfully processed image job ${job.id} for file: ${data.fileName}`,
      );

      // Update progress to 100%
      await job.progress(100);

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to process image job ${job.id} for file: ${data.fileName}`,
        error,
      );
      throw error;
    }
  }

  @Process("update-photo-urls")
  async updatePhotoUrls(
    job: Job<{ photoId: string; imageUrls: ImageSizes }>,
  ): Promise<void> {
    const { photoId, imageUrls } = job.data;

    this.logger.log(`Updating photo URLs for photo ${photoId}`);

    try {
      await this.venuePhotoRepository.updateImageUrls(photoId, {
        thumbnailUrl: imageUrls.thumbnail,
        mediumUrl: imageUrls.medium,
        largeUrl: imageUrls.large,
      });

      this.logger.log(`Successfully updated photo URLs for photo ${photoId}`);
    } catch (error) {
      this.logger.error(
        `Failed to update photo URLs for photo ${photoId}`,
        error,
      );
      throw error;
    }
  }
}
