import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { AgeVerificationRepository } from "../repositories/age-verification.repository";
import { AuthRepository } from "../repositories/auth.repository";
import { OnfidoService } from "./onfido.service";
import { AgeVerificationStatus } from "../entities/age-verification.entity";

@Injectable()
export class AgeVerificationService {
  private readonly logger = new Logger(AgeVerificationService.name);

  constructor(
    private readonly ageVerificationRepository: AgeVerificationRepository,
    private readonly authRepository: AuthRepository,
    private readonly onfidoService: OnfidoService,
  ) {}

  async initiateVerification(
    userId: string,
    documentType: string,
    frontDocumentImageBase64: string,
    backDocumentImageBase64?: string,
    selfieImageBase64?: string,
  ) {
    // Check if verification already exists for this user
    const verificationExists =
      await this.ageVerificationRepository.exists(userId);
    if (verificationExists) {
      throw new BadRequestException(
        "Age verification already submitted for this user",
      );
    }

    // Get user data
    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Create Onfido applicant
    const applicantId = await this.onfidoService.createApplicant(
      user.displayName.split(" ")[0] || "User", // First name fallback
      user.displayName.split(" ").slice(1).join(" ") || "User", // Last name fallback
      user.email,
    );

    // Upload document
    await this.onfidoService.uploadDocument(
      applicantId,
      documentType,
      frontDocumentImageBase64,
      backDocumentImageBase64,
    );

    // Upload selfie
    if (selfieImageBase64) {
      await this.onfidoService.uploadSelfie(applicantId, selfieImageBase64);
    }

    // Create check
    const checkId = await this.onfidoService.createCheck(applicantId);

    // Save verification record
    const verification = await this.ageVerificationRepository.create({
      userId,
      onfidoApplicantId: applicantId,
      onfidoCheckId: checkId,
      documentType,
      status: AgeVerificationStatus.PENDING,
    });

    return {
      verificationId: verification.id,
      status: verification.status,
      message: "Age verification submitted successfully and is pending review",
    };
  }

  async getVerificationStatus(userId: string) {
    try {
      const verification =
        await this.ageVerificationRepository.findByUserId(userId);

      // If we have a pending verification, check the status from Onfido
      if (
        verification.status === AgeVerificationStatus.PENDING &&
        verification.onfidoCheckId
      ) {
        const checkStatus = await this.onfidoService.getCheckStatus(
          verification.onfidoCheckId,
        );

        // Update status if completed
        if (checkStatus.status === "complete") {
          if (checkStatus.result === "clear") {
            await this.updateVerificationStatus(
              verification.id,
              AgeVerificationStatus.APPROVED,
              userId,
            );
            verification.status = AgeVerificationStatus.APPROVED;
          } else {
            await this.updateVerificationStatus(
              verification.id,
              AgeVerificationStatus.REJECTED,
              userId,
              "ID verification failed",
            );
            verification.status = AgeVerificationStatus.REJECTED;
          }
        }
      }

      return {
        verificationId: verification.id,
        status: verification.status,
        submittedAt: verification.createdAt,
        verifiedAt: verification.verifiedAt,
        rejectionReason: verification.rejectionReason,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          status: "not_submitted",
          message: "Age verification has not been submitted yet",
        };
      }
      throw error;
    }
  }

  async processVerificationCallback(checkId: string) {
    try {
      const verification =
        await this.ageVerificationRepository.findByOnfidoCheckId(checkId);
      const checkStatus = await this.onfidoService.getCheckStatus(checkId);

      if (checkStatus.status === "complete") {
        if (checkStatus.result === "clear") {
          await this.updateVerificationStatus(
            verification.id,
            AgeVerificationStatus.APPROVED,
            verification.userId,
          );
        } else {
          await this.updateVerificationStatus(
            verification.id,
            AgeVerificationStatus.REJECTED,
            verification.userId,
            "ID verification failed",
          );
        }
      }

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Error processing verification callback: ${error.message}`,
        error.stack,
      );
      // Always return success to Onfido webhook
      return { success: true };
    }
  }

  private async updateVerificationStatus(
    verificationId: string,
    status: AgeVerificationStatus,
    userId: string,
    rejectionReason?: string,
  ) {
    await this.ageVerificationRepository.updateStatus(
      verificationId,
      status,
      rejectionReason,
    );

    // Update user's age verification status if approved
    if (status === AgeVerificationStatus.APPROVED) {
      await this.authRepository.updateAgeVerificationStatus(userId, true);
    }
  }
}
