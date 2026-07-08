import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { userRepository } from '../repositories/user.repository';
import { applicationRepository } from '../repositories/application.repository';
import { documentRepository, paymentRepository } from '../repositories/common.repository';
import { response } from '../helpers/response';
import { authenticate } from '../middleware/auth';
import { NotFoundError } from '../errors/AppError';
import type { LambdaResponse } from '../types';

export class DashboardController {
  // ── GET /dashboard ────────────────────────────────────────────

  async getDashboard(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);

    const userRecord = await userRepository.findById(user.userId);
    if (!userRecord) throw new NotFoundError('User not found');

    const candidate = await userRepository.findCandidateByUserId(user.userId);
    if (!candidate) {
      return response.success(200, {
        data: {
          candidateName: userRecord.fullName,
          registrationNumber: null,
          applicationStatus: null,
          paymentStatus: null,
          verificationStatus: {
            mobile: false,
            email: false,
          },
          admitCard: { available: false, downloadUrl: null },
          notices: [],
        },
      });
    }

    const latestApplication = await applicationRepository.findDraftByCandidateId(candidate.id);
    const applications = await applicationRepository.findByCandidateId(candidate.id);

    let paymentStatus = 'not_initiated';
    if (latestApplication) {
      const payments = await paymentRepository.findByApplicationId(latestApplication.id);
      const completedPayment = payments.find((p) => p.status === 'completed');
      paymentStatus = completedPayment
        ? 'completed'
        : payments.length > 0
          ? 'pending'
          : 'not_initiated';
    }

    const submittedApplications = applications.filter((a) => a.isSubmitted);

    return response.success(200, {
      data: {
        candidateName: userRecord.fullName,
        registrationNumber: candidate.registrationNumber,
        applicationStatus: latestApplication?.status ?? 'not_started',
        paymentStatus,
        verificationStatus: {
          mobile: candidate.mobileVerified,
          email: candidate.emailVerified,
        },
        admitCard: { available: false, downloadUrl: null },
        totalApplications: applications.length,
        submittedApplications: submittedApplications.length,
        notices: [
          {
            id: 'notice-001',
            title: 'Important: Last Date for Application Submission',
            content: 'The last date to submit applications has been extended.',
            publishedAt: new Date().toISOString(),
            type: 'important',
          },
        ],
      },
    });
  }

  // ── GET /dashboard/notifications ──────────────────────────────

  async getNotifications(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    await authenticate(event);
    return response.success(200, {
      data: {
        notifications: [],
        unreadCount: 0,
      },
    });
  }

  // ── GET /dashboard/admit-card ─────────────────────────────────

  async getAdmitCard(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const candidate = await userRepository.findCandidateByUserId(user.userId);
    if (!candidate) throw new NotFoundError('Candidate profile not found');

    return response.success(200, {
      data: {
        available: false,
        message: 'Admit card will be available after the application review period.',
        downloadUrl: null,
      },
    });
  }

  // ── GET /dashboard/result ─────────────────────────────────────

  async getResult(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    await authenticate(event);
    return response.success(200, {
      data: {
        available: false,
        message: 'Results have not been declared yet.',
        downloadUrl: null,
      },
    });
  }
}

export const dashboardController = new DashboardController();
export default dashboardController;
