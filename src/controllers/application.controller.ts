import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { applicationService } from '../services/application.service';
import { userRepository } from '../repositories/user.repository';
import { response } from '../helpers/response';
import { parseEvent } from '../helpers/request';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { updateStepSchema } from '../validators/application';
import { NotFoundError, AppError } from '../errors/AppError';
import type { LambdaResponse } from '../types';
import { log } from 'console';

export class ApplicationController {
  // ── GET /application ──────────────────────────────────────────

  async getDraft(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const candidate = await userRepository.findCandidateByUserId(user.userId);
    if (!candidate) throw new NotFoundError('Candidate profile not found');

    const draft = await applicationService.getOrCreateDraft(candidate.id);
    return response.success(200, { message: 'Application draft retrieved', data: draft });
  }

  // ── GET /application/{applicationId} ──────────────────────────

  async getApplication(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const { pathParameters } = parseEvent(event);
    const applicationId = pathParameters.applicationId;
    if (!applicationId) throw new AppError('Application ID is required', 400);

    const candidate = await userRepository.findCandidateByUserId(user.userId);
    if (!candidate) throw new NotFoundError('Candidate profile not found');

    const application = await applicationService.getApplicationStatus(applicationId, candidate.id);
    return response.success(200, { data: application });
  }

  // ── POST /application/{applicationId}/step/{stepNumber} ────────

  async saveStep(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const { pathParameters, body } = parseEvent(event);
    const { applicationId, stepNumber } = pathParameters;

    if (!applicationId) throw new AppError('Application ID is required', 400);
    const step = parseInt(stepNumber ?? '0', 10);
    if (isNaN(step) || step < 0 || step > 8) {
      throw new AppError('Invalid step number (0-8)', 400);
    }

    const candidate = await userRepository.findCandidateByUserId(user.userId);
    if (!candidate) throw new NotFoundError('Candidate profile not found');

    const input = validate(updateStepSchema, { step, data: body, ...body });
    const result = await applicationService.saveStep(applicationId, candidate.id, step, body);

    return response.success(200, {
      message: `Step ${step} saved successfully`,
      data: result,
    });
  }

  // ── GET /application/{applicationId}/step/{stepNumber} ─────────

  async getStep(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const { pathParameters } = parseEvent(event);
    const { applicationId, stepNumber } = pathParameters;

    if (!applicationId) throw new AppError('Application ID is required', 400);
    const step = parseInt(stepNumber ?? '0', 10);

    const candidate = await userRepository.findCandidateByUserId(user.userId);
    if (!candidate) throw new NotFoundError('Candidate profile not found');

    const data = await applicationService.getStepData(applicationId, candidate.id, step);
    return response.success(200, { data: data ?? {} });
  }

  // ── POST /application/{applicationId}/submit ──────────────────

  async submit(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const { pathParameters } = parseEvent(event);
    const applicationId = pathParameters.applicationId;
    if (!applicationId) throw new AppError('Application ID is required', 400);

    const candidate = await userRepository.findCandidateByUserId(user.userId);
    if (!candidate) throw new NotFoundError('Candidate profile not found');

    const submitted = await applicationService.submitApplication(applicationId, candidate.id);
    return response.success(200, {
      message: 'Application submitted successfully',
      data: {
        applicationId: submitted.id,
        referenceNumber: submitted.applicationReferenceNumber,
        submissionDate: submitted.submissionDate,
        status: submitted.status,
      },
    });
  }

  // ── GET /application/{applicationId}/print ────────────────────

  async getPrintPreview(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const { pathParameters } = parseEvent(event);
    const applicationId = pathParameters.applicationId;
    if (!applicationId) throw new AppError('Application ID is required', 400);

    const candidate = await userRepository.findCandidateByUserId(user.userId);
    if (!candidate) throw new NotFoundError('Candidate profile not found');

    const htmlString = await applicationService.generateHtml(applicationId, candidate.id);
    const base64 = Buffer.from(htmlString).toString('base64');
    const fileName = `application_${applicationId}.html`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Access-Control-Allow-Origin': event.headers?.origin || event.headers?.Origin || '*',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: base64,
      isBase64Encoded: true,
    };
  }

  // ── GET /application/{applicationId}/steps or GET /application/steps/all ────

  async getAllStepsData(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const { pathParameters } = parseEvent(event);
    const applicationId = pathParameters?.applicationId;

    const candidate = await userRepository.findCandidateByUserId(user.userId);
    if (!candidate) throw new NotFoundError('Candidate profile not found');

    const data = await applicationService.getAllStepsData(candidate.id, applicationId);
    return response.success(200, { data });
  }

  // ── POST /application/{applicationId}/submit-final (LEGACY) ───

  async finalSubmitLegacy(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const { pathParameters } = parseEvent(event);
    const applicationId = pathParameters.applicationId;
    if (!applicationId) throw new AppError('Application ID is required', 400);

    const candidate = await userRepository.findCandidateByUserId(user.userId);
    if (!candidate) throw new NotFoundError('Candidate profile not found');

    const result = await applicationService.finalSubmitLegacy(applicationId, candidate.id);
    return response.success(200, {
      message: 'Application finalized and structured successfully',
      data: result,
    });
  }

  // ── POST /application/{applicationId}/final-submit ────────────

  async unifiedFinalSubmit(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const { pathParameters } = parseEvent(event);
    const applicationId = pathParameters.applicationId;
    if (!applicationId) throw new AppError('Application ID is required', 400);

    const candidate = await userRepository.findCandidateByUserId(user.userId);
    if (!candidate) throw new NotFoundError('Candidate profile not found');

    const result = await applicationService.unifiedFinalSubmit(applicationId, candidate.id);
    return response.success(200, {
      message: 'Application monolithic final submission processed successfully',
      data: result,
    });
  }
}

export const applicationController = new ApplicationController();
export default applicationController;
