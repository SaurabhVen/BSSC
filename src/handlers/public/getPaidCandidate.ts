import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { paidCandidateController } from '../../controllers/paidCandidate.controller';
import { errorHandler } from '../../middleware/errorHandler';

export const handler = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  paidCandidateController.getCandidate(event)
);
