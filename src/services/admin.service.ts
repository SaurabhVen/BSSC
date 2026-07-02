import ExcelJS from 'exceljs';
import { adminRepository } from '../repositories/admin.repository';
import { documentService } from './document.service';
import type { CandidateListFilter } from '../repositories/admin.repository';

export class AdminService {
  // ── 1. List candidates with pagination + filters ─────────────

  async listCandidates(filter: CandidateListFilter) {
    return adminRepository.listCandidates(filter);
  }

  // ── 2. Get full candidate detail ─────────────────────────────

  async getCandidateDetail(candidateId: string) {
    const detail = await adminRepository.getCandidateDetail(candidateId);
    if (!detail) return null;

    // Enrich document URLs
    if (Array.isArray(detail.documents)) {
      detail.documents = await Promise.all(
        detail.documents.map(async (doc: any) => {
          try {
            const url = await documentService.getPresignedUrl(doc.fileUrl);
            return { ...doc, signedUrl: url };
          } catch {
            return { ...doc, signedUrl: null };
          }
        })
      );
    }

    return detail;
  }

  // ── 3. List candidate documents (paginated) ──────────────────

  async getCandidateDocuments(candidateId: string, page: number, limit: number) {
    const result = await adminRepository.getCandidateDocuments(candidateId, page, limit);

    // Enrich with signed URLs
    result.data = await Promise.all(
      result.data.map(async (doc: any) => {
        try {
          const url = await documentService.getPresignedUrl(doc.fileUrl);
          return { ...doc, signedUrl: url };
        } catch {
          return { ...doc, signedUrl: null };
        }
      })
    );

    return result;
  }

  // ── 4. Admin dashboard stats ─────────────────────────────────

  async getStats() {
    return adminRepository.getStats();
  }

  // ── 5. Export candidates to XLSX Buffer ──────────────────────

  async exportCandidatesXlsx(filter: Omit<CandidateListFilter, 'page' | 'limit'>): Promise<Buffer> {
    const rows = await adminRepository.listCandidatesForExport(filter);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BSSC Admin Portal';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Candidates', {
      pageSetup: { orientation: 'landscape', fitToPage: true },
    });

    // ── Header row ──
    sheet.columns = [
      { header: 'S.No', key: 'sno', width: 6 },
      { header: 'Registration Number', key: 'registrationNumber', width: 22 },
      { header: 'First Name', key: 'firstName', width: 18 },
      { header: 'Last Name', key: 'lastName', width: 18 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Mobile Number', key: 'mobileNumber', width: 16 },
      { header: 'Alternate Number', key: 'alternateNumber', width: 16 },
      { header: 'Date of Birth', key: 'dateOfBirth', width: 14 },
      { header: 'Mobile Verified', key: 'mobileVerified', width: 15 },
      { header: 'Email Verified', key: 'emailVerified', width: 14 },
      { header: 'Application Status', key: 'applicationStatus', width: 18 },
      { header: 'Current Step', key: 'currentStep', width: 13 },
      { header: 'Is Submitted', key: 'isSubmitted', width: 13 },
      { header: 'Reference Number', key: 'applicationReferenceNumber', width: 22 },
      { header: 'Submission Date', key: 'submissionDate', width: 18 },
      { header: 'Account Active', key: 'isActive', width: 14 },
      { header: 'Registered On', key: 'createdAt', width: 20 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F3864' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 20;

    // Data rows
    rows.forEach((row, idx) => {
      const dataRow = sheet.addRow({
        sno: idx + 1,
        registrationNumber: row.registrationNumber ?? 'N/A',
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        mobileNumber: row.mobileNumber ?? '',
        alternateNumber: row.alternateNumber ?? '',
        dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth).toLocaleDateString('en-IN') : '',
        mobileVerified: row.mobileVerified ? 'Yes' : 'No',
        emailVerified: row.emailVerified ? 'Yes' : 'No',
        applicationStatus: row.applicationStatus ?? 'Not Started',
        currentStep: row.currentStep ?? 0,
        isSubmitted: row.isSubmitted ? 'Yes' : 'No',
        applicationReferenceNumber: row.applicationReferenceNumber ?? '',
        submissionDate: row.submissionDate
          ? new Date(row.submissionDate).toLocaleDateString('en-IN')
          : '',
        isActive: row.isActive ? 'Yes' : 'No',
        createdAt: new Date(row.createdAt).toLocaleDateString('en-IN'),
      });

      // Alternate row shading
      if (idx % 2 === 1) {
        dataRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F4FF' },
        };
      }
      dataRow.alignment = { vertical: 'middle' };
    });

    // Auto-filter
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columns.length },
    };

    // Freeze top row
    sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

    // Return as buffer
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  // ── 6. Verify / unverify a document ─────────────────────────

  async verifyDocument(documentId: string, isVerified: boolean) {
    return adminRepository.verifyDocument(documentId, isVerified);
  }
}

export const adminService = new AdminService();
export default adminService;
