import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { documentRepository } from '../repositories/common.repository';
import { userRepository } from '../repositories/user.repository';
import { AppError, NotFoundError, ForbiddenError } from '../errors/AppError';
import { generateUUID } from '../utils/crypto';
import type { DocumentUploadResult } from '../types';
import config from '../config';

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  photograph: ['image/jpeg', 'image/jpg', 'image/png'],
  signature: ['image/jpeg', 'image/jpg', 'image/png'],
  signature_english: ['image/jpeg', 'image/jpg'],
  signature_hindi: ['image/jpeg', 'image/jpg'],
  live_photo: ['image/jpeg', 'image/jpg'],
  identityProof: ['application/pdf', 'image/jpeg', 'image/png'],
  categoryProof: ['application/pdf', 'image/jpeg', 'image/png'],
  educationProof: ['application/pdf', 'image/jpeg', 'image/png'],
};

const MAX_FILE_SIZES: Record<string, number> = {
  photograph: 50 * 1024, // 50 KB
  signature: 3 * 1024 * 1024, // 3 MB
  signature_english: 30 * 1024, // 30 KB
  signature_hindi: 30 * 1024, // 30 KB
  live_photo: 100 * 1024, // 100 KB
  identityProof: 3 * 1024 * 1024, // 3 MB
  categoryProof: 3 * 1024 * 1024, // 3 MB
  educationProof: 3 * 1024 * 1024, // 3 MB
};

const s3Client = new S3Client({ region: config.AWS_REGION });

export interface FileUploadInput {
  candidateId: string;
  documentType: string;
  fileName: string;
  mimeType: string;
  fileContent: Buffer;
  fileSize: number;
}

export class DocumentService {
  // ── Upload ────────────────────────────────────────────────────

  async generateUploadPresignedUrl(input: {
    candidateId: string;
    documentType: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  }) {
    const allowedTypes = ALLOWED_MIME_TYPES[input.documentType];
    if (!allowedTypes) throw new AppError(`Invalid document type: ${input.documentType}`, 400);
    if (!allowedTypes.includes(input.mimeType)) {
      throw new AppError(
        `Invalid file type. Allowed types for ${input.documentType}: ${allowedTypes.join(', ')}`,
        422
      );
    }

    const maxSize = MAX_FILE_SIZES[input.documentType];
    if (input.fileSize > maxSize) {
      throw new AppError(`File size exceeds limit. Maximum allowed: 3 MB`, 422);
    }

    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    let s3Folder = 'document';
    if (['photograph', 'live_photo'].includes(input.documentType)) {
      s3Folder = 'photo';
    } else if (['signature_english', 'signature_hindi', 'signature'].includes(input.documentType)) {
      s3Folder = 'signature';
    }

    const fileKey = `candidates/${year}/${month}/${day}/${input.candidateId}/${s3Folder}/${generateUUID()}-${input.fileName}`;
    let fileUrl: string;
    let uploadUrl: string;

    if (config.MOCK_S3) {
      fileUrl = `https://mock-s3.local/${config.S3_BUCKET}/${fileKey}`;
      uploadUrl = `https://mock-s3.local/presigned-upload/${fileKey}`;
    } else {
      fileUrl = `https://${config.S3_BUCKET}.s3.${config.AWS_REGION}.amazonaws.com/${fileKey}`;
      const s3Params: PutObjectCommandInput = {
        Bucket: config.S3_BUCKET,
        Key: fileKey,
        ContentType: input.mimeType,
        Metadata: {
          candidateId: input.candidateId,
          documentType: input.documentType,
        },
      };
      uploadUrl = await getSignedUrl(s3Client, new PutObjectCommand(s3Params), { expiresIn: 3600 });
    }

    const existingDoc = await documentRepository.findByCandidateAndType(
      input.candidateId,
      input.documentType
    );
    if (existingDoc) {
      await this.deleteFromS3(existingDoc.fileUrl);
      await documentRepository.delete(existingDoc.id);
    }

    const document = await documentRepository.create({
      candidateId: input.candidateId,
      documentType: input.documentType,
      fileName: input.fileName,
      fileUrl,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
    });

    return {
      uploadUrl,
      documentId: document.id,
      documentType: document.documentType,
      fileName: document.fileName,
      fileUrl: document.fileUrl,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      createdAt: document.createdAt,
    };
  }

  async uploadDocument(input: FileUploadInput): Promise<DocumentUploadResult> {
    const allowedTypes = ALLOWED_MIME_TYPES[input.documentType];
    if (!allowedTypes) throw new AppError(`Invalid document type: ${input.documentType}`, 400);
    if (!allowedTypes.includes(input.mimeType)) {
      throw new AppError(
        `Invalid file type. Allowed types for ${input.documentType}: ${allowedTypes.join(', ')}`,
        422
      );
    }

    const maxSize = MAX_FILE_SIZES[input.documentType];
    if (input.fileSize > maxSize) {
      const sizeStr = maxSize >= 1024 * 1024 ? `${maxSize / (1024 * 1024)} MB` : `${maxSize / 1024} KB`;
      throw new AppError(`File size exceeds limit. Maximum allowed: ${sizeStr}`, 422);
    }

    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    let s3Folder = 'document';
    if (['photograph', 'live_photo'].includes(input.documentType)) {
      s3Folder = 'photo';
    } else if (['signature_english', 'signature_hindi', 'signature'].includes(input.documentType)) {
      s3Folder = 'signature';
    }

    const fileKey = `candidates/${year}/${month}/${day}/${input.candidateId}/${s3Folder}/${generateUUID()}-${input.fileName}`;
    let fileUrl: string;

    if (config.MOCK_S3) {
      fileUrl = `https://mock-s3.local/${config.S3_BUCKET}/${fileKey}`;
      console.log(`[MOCK S3] Would upload: ${fileKey}`);
    } else {
      const s3Params: PutObjectCommandInput = {
        Bucket: config.S3_BUCKET,
        Key: fileKey,
        Body: input.fileContent,
        ContentType: input.mimeType,
        Metadata: {
          candidateId: input.candidateId,
          documentType: input.documentType,
        },
      };
      await s3Client.send(new PutObjectCommand(s3Params));
      fileUrl = `https://${config.S3_BUCKET}.s3.${config.AWS_REGION}.amazonaws.com/${fileKey}`;
    }

    const existingDoc = await documentRepository.findByCandidateAndType(
      input.candidateId,
      input.documentType
    );
    if (existingDoc) {
      await this.deleteFromS3(existingDoc.fileUrl);
      await documentRepository.delete(existingDoc.id);
    }

    const document = await documentRepository.create({
      candidateId: input.candidateId,
      documentType: input.documentType,
      fileName: input.fileName,
      fileUrl,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
    });

    return {
      documentId: document.id,
      documentType: document.documentType,
      fileName: document.fileName,
      fileUrl: document.fileUrl,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      createdAt: document.createdAt,
    };
  }

  async generateUploadPresignedUrlStep5(input: {
    candidateId: string;
    userId: string;
    documentType: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  }) {
    const isPhotoOrSignature = input.documentType === 'photo' || input.documentType === 'signature';
    const allowedTypes = isPhotoOrSignature
      ? ['image/jpeg', 'image/jpg', 'image/png']
      : ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

    if (!allowedTypes.includes(input.mimeType)) {
      throw new AppError(
        `Invalid file type. Allowed types for ${input.documentType}: ${allowedTypes.join(', ')}`,
        422
      );
    }

    const maxSize = 3 * 1024 * 1024; // 3 MB
    if (input.fileSize > maxSize) {
      throw new AppError(`File size exceeds limit. Maximum allowed: 3 MB`, 422);
    }

    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const originalName = input.fileName.replace(/.*[\\/]/, '');
    const dotIndex = originalName.lastIndexOf('.');
    const ext = dotIndex !== -1 ? originalName.substring(dotIndex + 1) : '';
    const fileKey = `${year}/${month}/${day}/${input.userId}/${input.documentType}${ext ? '.' + ext : ''}`;

    const newFileUrl = config.MOCK_S3
      ? `https://mock-s3.local/${config.S3_BUCKET}/${fileKey}`
      : `https://${config.S3_BUCKET}.s3.${config.AWS_REGION}.amazonaws.com/${fileKey}`;

    let uploadUrl = '';
    if (config.MOCK_S3) {
      uploadUrl = `https://mock-s3.local/presigned-upload/${fileKey}`;
    } else {
      const s3Params: PutObjectCommandInput = {
        Bucket: config.S3_BUCKET,
        Key: fileKey,
        ContentType: input.mimeType,
        Metadata: {
          candidateId: input.candidateId,
          documentType: input.documentType,
        },
      };
      uploadUrl = await getSignedUrl(s3Client, new PutObjectCommand(s3Params), { expiresIn: 3600 });
    }

    const existingDoc = await documentRepository.findByCandidateAndType(
      input.candidateId,
      input.documentType
    );

    if (existingDoc && existingDoc.fileUrl !== newFileUrl) {
      await this.deleteFromS3(existingDoc.fileUrl);
    }

    let document;
    if (existingDoc) {
      document = await documentRepository.update(existingDoc.id, {
        fileName: input.fileName,
        fileUrl: newFileUrl,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
      });
    } else {
      document = await documentRepository.create({
        candidateId: input.candidateId,
        documentType: input.documentType,
        fileName: input.fileName,
        fileUrl: newFileUrl,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
      });
    }

    return {
      uploadUrl,
      documentId: document.id,
      documentType: document.documentType,
      fileName: document.fileName,
      fileUrl: document.fileUrl,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      createdAt: document.createdAt,
    };
  }

  async uploadDocumentStep5(input: {
    candidateId: string;
    userId: string;
    documentType: string;
    fileName: string;
    mimeType: string;
    fileContent: Buffer;
    fileSize: number;
  }): Promise<DocumentUploadResult> {
    const isPhotoOrSignature = input.documentType === 'photo' || input.documentType === 'signature';
    const allowedTypes = isPhotoOrSignature
      ? ['image/jpeg', 'image/jpg', 'image/png']
      : ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

    if (!allowedTypes.includes(input.mimeType)) {
      throw new AppError(
        `Invalid file type. Allowed types for ${input.documentType}: ${allowedTypes.join(', ')}`,
        422
      );
    }

    const maxSize = 3 * 1024 * 1024; // 3 MB for all document types

    if (input.fileSize > maxSize) {
      throw new AppError(`File size exceeds limit. Maximum allowed: 3 MB`, 422);
    }

    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    // Strip path prefix (Windows clients may send C:\path\file.pdf) and preserve original extension as-is
    const originalName = input.fileName.replace(/.*[\\/]/, '');
    const dotIndex = originalName.lastIndexOf('.');
    const ext = dotIndex !== -1 ? originalName.substring(dotIndex + 1) : '';
    // Format S3 path as year/month/day/userId/documentType.extension
    const fileKey = `${year}/${month}/${day}/${input.userId}/${input.documentType}${ext ? '.' + ext : ''}`;

    const newFileUrl = config.MOCK_S3
      ? `https://mock-s3.local/${config.S3_BUCKET}/${fileKey}`
      : `https://${config.S3_BUCKET}.s3.${config.AWS_REGION}.amazonaws.com/${fileKey}`;

    // 1. Fetch existing doc first to check for changes
    const existingDoc = await documentRepository.findByCandidateAndType(
      input.candidateId,
      input.documentType
    );

    // 2. Upload the new file to S3
    if (config.MOCK_S3) {
      console.log(`[MOCK S3] Would upload: ${fileKey}`);
    } else {
      const s3Params: PutObjectCommandInput = {
        Bucket: config.S3_BUCKET,
        Key: fileKey,
        Body: input.fileContent,
        ContentType: input.mimeType,
        Metadata: {
          candidateId: input.candidateId,
          documentType: input.documentType,
        },
      };
      await s3Client.send(new PutObjectCommand(s3Params));
    }

    // 3. Clean up the old S3 file ONLY if the file URL changed (e.g. extension changed)
    if (existingDoc && existingDoc.fileUrl !== newFileUrl) {
      await this.deleteFromS3(existingDoc.fileUrl);
    }

    // 4. Update the DB record (or create new if none existed)
    let document;
    if (existingDoc) {
      document = await documentRepository.update(existingDoc.id, {
        fileName: input.fileName,
        fileUrl: newFileUrl,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
      });
    } else {
      document = await documentRepository.create({
        candidateId: input.candidateId,
        documentType: input.documentType,
        fileName: input.fileName,
        fileUrl: newFileUrl,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
      });
    }

    return {
      documentId: document.id,
      documentType: document.documentType,
      fileName: document.fileName,
      fileUrl: document.fileUrl,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      createdAt: document.createdAt,
    };
  }

  async uploadGeneratedHtml(
    candidateId: string,
    fileContent: Buffer,
    refNo: string
  ): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const fileName = `application_${candidateId}_${refNo}.html`;

    const fileKey = `report/BSSCApplication/${year}/${month}/${fileName}`;

    if (config.MOCK_S3) {
      console.log(`[MOCK S3] Would upload generated HTML to: ${fileKey}`);
      return `https://mock-s3.local/${config.S3_BUCKET}/${fileKey}`;
    }

    const s3Params: PutObjectCommandInput = {
      Bucket: config.S3_BUCKET,
      Key: fileKey,
      Body: fileContent,
      ContentType: 'text/html',
      Metadata: {
        candidateId,
        documentType: 'final_application_html',
      },
    };

    await s3Client.send(new PutObjectCommand(s3Params));
    return `https://${config.S3_BUCKET}.s3.${config.AWS_REGION}.amazonaws.com/${fileKey}`;
  }

  // ── Get Presigned URL ─────────────────────────────────────────

  async getDownloadUrl(documentId: string, candidateId: string): Promise<string> {
    let document;
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (uuidRegex.test(documentId)) {
      document = await documentRepository.findById(documentId);
    } else {
      document = await documentRepository.findByCandidateAndType(candidateId, documentId);
    }

    if (!document) throw new NotFoundError('Document not found');
    if (document.candidateId !== candidateId) {
      throw new ForbiddenError('Document does not belong to this candidate');
    }

    if (config.MOCK_S3) return document.fileUrl;

    const key = document.fileUrl.split('.amazonaws.com/').pop() ?? '';
    const url = await getSignedUrl(
      s3Client,
      new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: key }),
      { expiresIn: 3600 }
    );
    return url;
  }

  async getDocumentPresignedUrl(
    documentId: string,
    candidateId: string,
    mode: 'view' | 'download'
  ): Promise<{ url: string; expiresIn: number }> {
    let document;
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (uuidRegex.test(documentId)) {
      document = await documentRepository.findById(documentId);
    } else {
      document = await documentRepository.findByCandidateAndType(candidateId, documentId);
    }

    if (!document) throw new NotFoundError('Document not found');
    if (document.candidateId !== candidateId) {
      throw new ForbiddenError('Document does not belong to this candidate');
    }

    const isView = mode === 'view';
    const expiresIn = isView
      ? config.PRESIGNED_URL_VIEW_EXPIRY
      : config.PRESIGNED_URL_DOWNLOAD_EXPIRY;

    if (config.MOCK_S3) return { url: document.fileUrl, expiresIn };

    const key = document.fileUrl.split('.amazonaws.com/').pop() ?? '';
    const ResponseContentDisposition = isView
      ? 'inline'
      : `attachment; filename="${document.fileName}"`;

    const url = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: config.S3_BUCKET,
        Key: key,
        ResponseContentDisposition,
        ResponseContentType: document.mimeType,
      }),
      { expiresIn }
    );
    return { url, expiresIn };
  }

  async getPresignedUrl(fileUrl: string): Promise<string | null> {
    if (config.MOCK_S3) return fileUrl;
    // Guard: legacy bug stored fake "s3://uploads/<uuid>" placeholders.
    // These are NOT real S3 HTTPS URLs and cannot be presigned.
    if (fileUrl.startsWith('s3://')) {
      console.warn('[S3] Skipping presign for corrupt placeholder URL:', fileUrl);
      return null;
    }
    try {
      const key = fileUrl.split('.amazonaws.com/').pop() ?? '';
      const url = await getSignedUrl(
        s3Client,
        new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: key }),
        { expiresIn: 3600 }
      );
      return url;
    } catch (err) {
      console.warn('[S3] Presign failed (non-fatal):', (err as Error).message);
      return fileUrl;
    }
  }

  // ── Get All Documents ─────────────────────────────────────────

  async getCandidateDocuments(candidateId: string): Promise<DocumentUploadResult[]> {
    const docs = await documentRepository.findByCandidateId(candidateId);
    return docs.map((d) => ({
      documentId: d.id,
      documentType: d.documentType,
      fileName: d.fileName,
      fileUrl: d.fileUrl,
      mimeType: d.mimeType,
      fileSize: d.fileSize,
      createdAt: d.createdAt,
    }));
  }

  // ── Delete ────────────────────────────────────────────────────

  async deleteDocument(documentId: string, candidateId: string): Promise<void> {
    let document;
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (uuidRegex.test(documentId)) {
      document = await documentRepository.findById(documentId);
    } else {
      document = await documentRepository.findByCandidateAndType(candidateId, documentId);
    }

    if (!document) throw new NotFoundError('Document not found');
    if (document.candidateId !== candidateId)
      throw new ForbiddenError('Document does not belong to this candidate');

    await this.deleteFromS3(document.fileUrl);
    await documentRepository.delete(document.id);
  }

  private async deleteFromS3(fileUrl: string): Promise<void> {
    if (config.MOCK_S3) return;
    try {
      const key = fileUrl.split('.amazonaws.com/').pop() ?? '';
      await s3Client.send(new DeleteObjectCommand({ Bucket: config.S3_BUCKET, Key: key }));
    } catch (err) {
      console.warn('[S3] Delete failed (non-fatal):', (err as Error).message);
    }
  }
}

export const documentService = new DocumentService();
export default documentService;
