import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

interface OnfidoApplicantResponse {
  id: string;
}

interface OnfidoDocumentResponse {
  id: string;
}

interface OnfidoSelfieResponse {
  id: string;
}

interface OnfidoCheckResponse {
  id: string;
}

interface OnfidoCheckStatusResponse {
  status: string;
  result?: string;
}

/**
 * Service for integrating with Onfido identity verification API
 * Handles age verification through document and biometric checks
 */
@Injectable()
export class OnfidoService {
  private readonly apiKey: string;
  private readonly baseUrl = "https://api.onfido.com/v3";
  private readonly logger = new Logger(OnfidoService.name);

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>("ONFIDO_API_KEY") || "";
    if (!this.apiKey) {
      this.logger.warn(
        "Onfido API key is not set. Age verification will not work correctly.",
      );
    }
  }

  /**
   * Creates an applicant in Onfido system
   * @param firstName First name of the user
   * @param lastName Last name of the user
   * @param email Email of the user
   * @returns Onfido applicant ID
   */
  async createApplicant(
    firstName: string,
    lastName: string,
    email: string,
  ): Promise<string> {
    try {
      const response = await axios.post<OnfidoApplicantResponse>(
        `${this.baseUrl}/applicants`,
        {
          first_name: firstName,
          last_name: lastName,
          email: email,
        },
        {
          headers: {
            Authorization: `Token token=${this.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      return response.data.id;
    } catch (error) {
      this.logger.error(
        `Failed to create Onfido applicant: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        "Failed to initialize age verification process",
      );
    }
  }

  /**
   * Uploads a document image to Onfido
   * @param applicantId Onfido applicant ID
   * @param documentType Type of document (passport, driving_licence, national_identity_card)
   * @param frontImageBase64 Base64 encoded front image of the document
   * @param backImageBase64 Base64 encoded back image of the document (optional)
   * @returns Onfido document ID
   */
  async uploadDocument(
    applicantId: string,
    documentType: string,
    frontImageBase64: string,
    backImageBase64?: string,
  ): Promise<string> {
    try {
      const requestData: any = {
        applicant_id: applicantId,
        type: documentType,
        file_data_front: frontImageBase64,
      };

      if (backImageBase64) {
        requestData.file_data_back = backImageBase64;
      }

      const response = await axios.post<OnfidoDocumentResponse>(
        `${this.baseUrl}/documents`,
        requestData,
        {
          headers: {
            Authorization: `Token token=${this.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      return response.data.id;
    } catch (error) {
      this.logger.error(
        `Failed to upload document to Onfido: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        "Failed to upload verification document",
      );
    }
  }

  /**
   * Uploads a selfie image to Onfido
   * @param applicantId Onfido applicant ID
   * @param selfieImageBase64 Base64 encoded selfie image
   * @returns Onfido selfie ID
   */
  async uploadSelfie(
    applicantId: string,
    selfieImageBase64: string,
  ): Promise<string> {
    try {
      const response = await axios.post<OnfidoSelfieResponse>(
        `${this.baseUrl}/live_photos`,
        {
          applicant_id: applicantId,
          file_data: selfieImageBase64,
        },
        {
          headers: {
            Authorization: `Token token=${this.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      return response.data.id;
    } catch (error) {
      this.logger.error(
        `Failed to upload selfie to Onfido: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        "Failed to upload verification selfie",
      );
    }
  }

  /**
   * Creates a verification check in Onfido
   * @param applicantId Onfido applicant ID
   * @returns Onfido check ID
   */
  async createCheck(applicantId: string): Promise<string> {
    try {
      const response = await axios.post<OnfidoCheckResponse>(
        `${this.baseUrl}/checks`,
        {
          applicant_id: applicantId,
          report_names: ["document", "facial_similarity"],
        },
        {
          headers: {
            Authorization: `Token token=${this.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      return response.data.id;
    } catch (error) {
      this.logger.error(
        `Failed to create Onfido check: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        "Failed to initiate verification check",
      );
    }
  }

  /**
   * Retrieves the status of a verification check
   * @param checkId Onfido check ID
   * @returns Check status and result
   */
  async getCheckStatus(
    checkId: string,
  ): Promise<{ status: string; result?: string }> {
    try {
      const response = await axios.get<OnfidoCheckStatusResponse>(
        `${this.baseUrl}/checks/${checkId}`,
        {
          headers: {
            Authorization: `Token token=${this.apiKey}`,
          },
        },
      );

      return {
        status: response.data.status,
        result: response.data.result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get Onfido check status: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        "Failed to check verification status",
      );
    }
  }
}
