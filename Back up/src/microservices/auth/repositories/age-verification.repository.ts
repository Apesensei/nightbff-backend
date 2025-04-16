import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  AgeVerification,
  AgeVerificationStatus,
} from "../entities/age-verification.entity";

@Injectable()
export class AgeVerificationRepository {
  constructor(
    @InjectRepository(AgeVerification)
    private readonly ageVerificationRepository: Repository<AgeVerification>,
  ) {}

  async create(data: Partial<AgeVerification>): Promise<AgeVerification> {
    const verification = this.ageVerificationRepository.create(data);
    return this.ageVerificationRepository.save(verification);
  }

  async findByUserId(userId: string): Promise<AgeVerification> {
    const verification = await this.ageVerificationRepository.findOne({
      where: { userId },
      relations: ["user"],
    });

    if (!verification) {
      throw new NotFoundException(
        `Age verification for user with ID ${userId} not found`,
      );
    }

    return verification;
  }

  async findByOnfidoCheckId(checkId: string): Promise<AgeVerification> {
    const verification = await this.ageVerificationRepository.findOne({
      where: { onfidoCheckId: checkId },
      relations: ["user"],
    });

    if (!verification) {
      throw new NotFoundException(
        `Age verification with check ID ${checkId} not found`,
      );
    }

    return verification;
  }

  async updateStatus(
    id: string,
    status: AgeVerificationStatus,
    rejectionReason?: string,
  ): Promise<AgeVerification> {
    const verification = await this.ageVerificationRepository.findOne({
      where: { id },
    });

    if (!verification) {
      throw new NotFoundException(`Age verification with ID ${id} not found`);
    }

    verification.status = status;

    if (status === AgeVerificationStatus.APPROVED) {
      verification.verifiedAt = new Date();
    }

    if (rejectionReason) {
      verification.rejectionReason = rejectionReason;
    }

    return this.ageVerificationRepository.save(verification);
  }

  async exists(userId: string): Promise<boolean> {
    const count = await this.ageVerificationRepository.count({
      where: { userId },
    });
    return count > 0;
  }
}
