import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import config from '../config';
import { adminService } from '../services/admin.service';
import { response } from '../helpers/response';
import { parseEvent } from '../helpers/request';
import { authenticate, requireRole } from '../middleware/auth';
import { AppError, NotFoundError } from '../errors/AppError';
import type { LambdaResponse } from '../types';
import type { CandidateListFilter } from '../repositories/admin.repository';

export class AdminController {
  // ── GET /admin/stats ──────────────────────────────────────────

  async getStats(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    requireRole(user, ['admin', 'Admins']);

    const stats = await adminService.getStats();
    return response.success(200, {
      message: 'Admin statistics retrieved successfully',
      data: stats,
    });
  }

  // ── GET /admin/candidates ─────────────────────────────────────
  // Query params: page, limit, search, status, isSubmitted,
  //               mobileVerified, emailVerified, fromDate, toDate,
  //               sortBy, sortOrder

  async listCandidates(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    requireRole(user, ['admin', 'Admins']);

    const { queryStringParameters: q } = parseEvent(event);

    const filter: CandidateListFilter = {
      page: q?.page ? parseInt(q.page, 10) : 1,
      limit: Math.min(parseInt(q?.limit ?? '20', 10), 100),
      search: q?.search || undefined,
      status: q?.status || undefined,
      isSubmitted: q?.isSubmitted !== undefined ? q.isSubmitted === 'true' : undefined,
      mobileVerified: q?.mobileVerified !== undefined ? q.mobileVerified === 'true' : undefined,
      emailVerified: q?.emailVerified !== undefined ? q.emailVerified === 'true' : undefined,
      fromDate: q?.fromDate || undefined,
      toDate: q?.toDate || undefined,
      sortBy: (q?.sortBy as CandidateListFilter['sortBy']) || 'createdAt',
      sortOrder: (q?.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const result = await adminService.listCandidates(filter);

    return response.success(200, {
      message: 'Candidates retrieved successfully',
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
      stats: result.stats,
    });
  }

  // ── GET /admin/candidates/{candidateId} ──────────────────────

  async getCandidateDetail(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    requireRole(user, ['admin', 'Admins']);

    const { pathParameters } = parseEvent(event);
    const { candidateId } = pathParameters;
    if (!candidateId) throw new AppError('Candidate ID is required', 400);

    const detail = await adminService.getCandidateDetail(candidateId);
    if (!detail) throw new NotFoundError('Candidate not found');

    return response.success(200, {
      message: 'Candidate details retrieved successfully',
      data: detail,
    });
  }

  // ── GET /admin/candidates/{candidateId}/documents ─────────────
  // Query params: page, limit

  async getCandidateDocuments(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    requireRole(user, ['admin', 'Admins']);

    const { pathParameters, queryStringParameters: q } = parseEvent(event);
    const { candidateId } = pathParameters;
    if (!candidateId) throw new AppError('Candidate ID is required', 400);

    const page = q?.page ? parseInt(q.page, 10) : 1;
    const limit = Math.min(parseInt(q?.limit ?? '20', 10), 50);

    const result = await adminService.getCandidateDocuments(candidateId, page, limit);

    return response.success(200, {
      message: 'Candidate documents retrieved successfully',
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  }

  // ── GET /admin/candidates/export/xlsx ────────────────────────
  // Accepts same query filters as listCandidates (except page/limit)
  // Returns base64-encoded XLSX

  async exportCandidatesXlsx(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    requireRole(user, ['admin', 'Admins']);

    const { queryStringParameters: q } = parseEvent(event);

    const filter: Omit<CandidateListFilter, 'page' | 'limit'> = {
      search: q?.search || undefined,
      status: q?.status || undefined,
      isSubmitted: q?.isSubmitted !== undefined ? q.isSubmitted === 'true' : undefined,
      mobileVerified: q?.mobileVerified !== undefined ? q.mobileVerified === 'true' : undefined,
      emailVerified: q?.emailVerified !== undefined ? q.emailVerified === 'true' : undefined,
      fromDate: q?.fromDate || undefined,
      toDate: q?.toDate || undefined,
    };

    const buffer = await adminService.exportCandidatesXlsx(filter);

    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const fileName = `candidates_export_${Date.now()}.xlsx`;
    const s3Key = `report/${year}/${month}/${fileName}`;

    let fileUrl: string;
    let downloadUrl: string;

    if (config.MOCK_S3) {
      fileUrl = `https://mock-s3.local/${config.S3_BUCKET}/${s3Key}`;
      downloadUrl = fileUrl;
    } else {
      const s3Client = new S3Client({ region: config.AWS_REGION });
      await s3Client.send(
        new PutObjectCommand({
          Bucket: config.S3_BUCKET,
          Key: s3Key,
          Body: buffer,
          ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
      );
      fileUrl = `https://${config.S3_BUCKET}.s3.${config.AWS_REGION}.amazonaws.com/${s3Key}`;

      downloadUrl = await getSignedUrl(
        s3Client,
        new GetObjectCommand({
          Bucket: config.S3_BUCKET,
          Key: s3Key,
          ResponseContentDisposition: `attachment; filename="${fileName}"`,
        }),
        { expiresIn: 3600 }
      );
    }

    return response.success(200, {
      message: 'Export saved to S3 successfully',
      s3Url: `s3://${config.S3_BUCKET}/${s3Key}`,
      fileUrl,
      downloadUrl,
    });
  }

  // ── PATCH /admin/documents/{documentId}/verify ───────────────

  async verifyDocument(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    requireRole(user, ['admin', 'Admins']);

    const { pathParameters, body } = parseEvent(event);
    const { documentId } = pathParameters;
    if (!documentId) throw new AppError('Document ID is required', 400);

    const isVerified = Boolean((body as any)?.isVerified ?? true);
    const doc = await adminService.verifyDocument(documentId, isVerified);

    if (!doc) throw new NotFoundError('Document not found');

    return response.success(200, {
      message: `Document ${isVerified ? 'verified' : 'unverified'} successfully`,
      data: doc,
    });
  }
}

export const adminController = new AdminController();
export default adminController;
