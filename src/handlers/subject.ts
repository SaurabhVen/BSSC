import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { subjectController } from '../controllers/subject.controller';
import { errorHandler } from '../middleware/errorHandler';

export const seedSubjects = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  subjectController.seed(event)
);

export const createSubject = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  subjectController.create(event)
);

export const listSubjects = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  subjectController.list(event)
);
