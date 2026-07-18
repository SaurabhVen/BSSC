import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { documentService } from '../services/document.service';
import { userRepository } from '../repositories/user.repository';
import { response } from '../helpers/response';
import { parseEvent } from '../helpers/request';
import { authenticate } from '../middleware/auth';
import { NotFoundError, AppError, ValidationError } from '../errors/AppError';
import type { LambdaResponse } from '../types';

const VALID_DOCUMENT_TYPES = [
  'photograph',
  'signature',
<<<<<<< HEAD
=======
  'signature_english',
  'signature_hindi',
  'live_photo',
>>>>>>> b5d3be6e099ba6bac81a614738a5b4b0d8414e74
  'identityProof',
  'categoryProof',
  'educationProof',
];

export class DocumentController {
  // ── POST /documents/upload ────────────────────────────────────


  async upload(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const candidate = await userRepository.findCandidateByUserId(user.userId);
    if (!candidate) throw new NotFoundError('Candidate profile not found');

    const { body, headers } = parseEvent(event);
    const documentType = body.documentType as string;
    const fileName = body.fileName as string;
    const mimeType = body.mimeType as string;
    const base64Content = body.fileContent as string;

    if (!documentType || !VALID_DOCUMENT_TYPES.includes(documentType)) {
      throw new ValidationError([
        { field: 'documentType', message: `Must be one of: ${VALID_DOCUMENT_TYPES.join(', ')}` },
      ]);
    }
    if (!fileName)
      throw new ValidationError([{ field: 'fileName', message: 'File name is required' }]);
    if (!mimeType)
      throw new ValidationError([{ field: 'mimeType', message: 'MIME type is required' }]);
    if (!base64Content)
      throw new ValidationError([
        { field: 'fileContent', message: 'File content (base64) is required' },
      ]);

    const fileBuffer = Buffer.from(base64Content, 'base64');
    const result = await documentService.uploadDocument({
      candidateId: candidate.id,
      documentType,
      fileName,
      mimeType,
      fileContent: fileBuffer,
      fileSize: fileBuffer.length,
    });

    return response.created({
      message: 'Document uploaded successfully',
      data: result,
    });
  }

  // ── GET /documents ────────────────────────────────────────────

  async getAll(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const candidate = await userRepository.findCandidateByUserId(user.userId);
    if (!candidate) throw new NotFoundError('Candidate profile not found');

    const documents = await documentService.getCandidateDocuments(candidate.id);
    return response.success(200, { data: documents });
  }

  // ── GET /documents/{documentId}/download ──────────────────────

  async getDownloadUrl(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const { pathParameters } = parseEvent(event);
    const documentId = pathParameters.documentId;
    if (!documentId) throw new AppError('Document ID is required', 400);

    const candidate = await userRepository.findCandidateByUserId(user.userId);
    if (!candidate) throw new NotFoundError('Candidate profile not found');

    const url = await documentService.getDownloadUrl(documentId, candidate.id);
    return response.success(200, {
      message: 'Download URL generated',
      url,
      expiresInSeconds: 3600,
    });
  }

  // ── GET /documents/{documentId}/presigned-url ──────────────────────

  async getPresignedUrl(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const { pathParameters, queryStringParameters } = parseEvent(event);
    const documentId = pathParameters.documentId;
    if (!documentId) throw new AppError('Document ID is required', 400);

    const mode = queryStringParameters?.mode === 'download' ? 'download' : 'view';

    const candidate = await userRepository.findCandidateByUserId(user.userId);
    if (!candidate) throw new NotFoundError('Candidate profile not found');

    const result = await documentService.getDocumentPresignedUrl(documentId, candidate.id, mode);
    return response.success(200, {
      message: 'Document URL generated successfully',
      data: {
        url: result.url,
        expires_in: result.expiresIn,
      },
    });
  }

  // ── DELETE /documents/{documentId} ────────────────────────────

  async delete(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const { pathParameters } = parseEvent(event);
    const documentId = pathParameters.documentId;
    if (!documentId) throw new AppError('Document ID is required', 400);

    const candidate = await userRepository.findCandidateByUserId(user.userId);
    if (!candidate) throw new NotFoundError('Candidate profile not found');

    await documentService.deleteDocument(documentId, candidate.id);
    return response.noContent();
  }
}

export const documentController = new DocumentController();
export default documentController;
