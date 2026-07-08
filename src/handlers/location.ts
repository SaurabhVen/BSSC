import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { locationController } from '../controllers/location.controller';
import { errorHandler } from '../middleware/errorHandler';

export const getCountries = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  locationController.getCountries(event)
);

export const getStates = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  locationController.getStates(event)
);

export const getDistricts = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  locationController.getDistricts(event)
);
