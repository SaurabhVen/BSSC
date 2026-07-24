import { paidCandidateRepository } from '../repositories/paidCandidate.repository';
import { type PaidCandidate } from '../database/schema';
import { NotFoundError } from '../errors/AppError';

export class PaidCandidateService {
  async getCandidate(
    regId: number,
    fatherName: string,
    motherName: string
  ): Promise<PaidCandidate> {
    const candidate = await paidCandidateRepository.findByDetails(regId, fatherName, motherName);
    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }
    return candidate;
  }
}

export const paidCandidateService = new PaidCandidateService();
export default paidCandidateService;
