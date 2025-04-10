import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  HttpStatus,
  HttpCode,
} from "@nestjs/common";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { AgeVerificationService } from "../services/age-verification.service";
import { AgeVerificationDto } from "../dto/age-verification.dto";
import { CurrentUser } from "../decorators/current-user.decorator";
import { User } from "../entities/user.entity";

@Controller("auth/age-verification")
export class AgeVerificationController {
  constructor(
    private readonly ageVerificationService: AgeVerificationService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  async submitVerification(
    @Body() ageVerificationDto: AgeVerificationDto,
    @CurrentUser() user: User,
  ) {
    return this.ageVerificationService.initiateVerification(
      user.id,
      ageVerificationDto.documentType,
      ageVerificationDto.frontDocumentImageBase64,
      ageVerificationDto.backDocumentImageBase64,
      ageVerificationDto.selfieImageBase64,
    );
  }

  @Get("status")
  @UseGuards(JwtAuthGuard)
  async getVerificationStatus(@CurrentUser() user: User) {
    return this.ageVerificationService.getVerificationStatus(user.id);
  }

  @Get("callback/:checkId")
  async handleCallback(@Param("checkId") checkId: string) {
    return this.ageVerificationService.processVerificationCallback(checkId);
  }
}
