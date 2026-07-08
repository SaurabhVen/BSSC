import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { postController } from '../controllers/post.controller';
import { errorHandler } from '../middleware/errorHandler';

export const listPosts = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  postController.list(event)
);
