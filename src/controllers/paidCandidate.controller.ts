import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { paidCandidateService } from '../services/paidCandidate.service';
import { response } from '../helpers/response';
import { parseEvent } from '../helpers/request';
import { validate } from '../middleware/validate';
import { getPaidCandidateSchema } from '../validators/paidCandidate';
import type { LambdaResponse } from '../types';

export class PaidCandidateController {
  async getCandidate(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const { body } = parseEvent(event);

    const input = validate(getPaidCandidateSchema, {
      regId: body?.regId || body?.regid || body?.registrationNumber || body?.RegId,
      fathername: body?.fathername || body?.fatherName,
      mothername: body?.mothername || body?.motherName,
      fullname: body?.fullname || body?.fullName || body?.candidateName || body?.candidatename,
    });

    const candidate = await paidCandidateService.getCandidate(
      input.regId,
      input.fathername,
      input.mothername,
      input.fullname
    );

    return response.success(200, {
      message: 'Candidate fetched successfully',
      data: {
        ...candidate,
        paymentStatus: 'completed',
        redirectStep: 3,
      },
    });
  }
}

export const paidCandidateController = new PaidCandidateController();
export default paidCandidateController;
