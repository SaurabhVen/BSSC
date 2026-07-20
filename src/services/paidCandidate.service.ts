import { paidCandidateRepository } from '../repositories/paidCandidate.repository';
import { type PaidCandidate } from '../database/schema';
import { ValidationError } from '../errors/AppError';

export class PaidCandidateService {
  async getCandidate(
    regId: number,
    fatherName: string,
    motherName: string,
    fullName?: string
  ): Promise<PaidCandidate> {
    // 1. Fetch by regId first to verify registration number
    const candidate = await paidCandidateRepository.findByRegId(regId);
    if (!candidate) {
      throw new ValidationError(
        [{ field: 'regId', message: 'Registration number is incorrect or not found' }],
        'Registration number is incorrect'
      );
    }

    // 2. Check Candidate's Name (fullName) if provided
    if (fullName) {
      const dbFullName = candidate.fullName || '';
      if (dbFullName.trim().toLowerCase() !== fullName.trim().toLowerCase()) {
        throw new ValidationError(
          [{ field: 'fullname', message: 'Candidate name is incorrect' }],
          'Candidate name is incorrect'
        );
      }
    }

    // 3. Check Father's Name
    const dbFatherName = candidate.fatherName || '';
    if (dbFatherName.trim().toLowerCase() !== fatherName.trim().toLowerCase()) {
      throw new ValidationError(
        [{ field: 'fathername', message: "Father's name is incorrect" }],
        "Father's name is incorrect"
      );
    }

    // 4. Check Mother's Name
    const dbMotherName = candidate.motherName || '';
    if (dbMotherName.trim().toLowerCase() !== motherName.trim().toLowerCase()) {
      throw new ValidationError(
        [{ field: 'mothername', message: "Mother's name is incorrect" }],
        "Mother's name is incorrect"
      );
    }

    return candidate;
  }
}

export const paidCandidateService = new PaidCandidateService();
export default paidCandidateService;
