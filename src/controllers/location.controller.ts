import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { locationRepository } from '../repositories/location.repository';
import { response } from '../helpers/response';
import { parseEvent } from '../helpers/request';
import { AppError } from '../errors/AppError';
import type { LambdaResponse } from '../types';

export class LocationController {
  // ── GET /countries ──────────────────────────────────────────
  async getCountries(_event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const data = await locationRepository.findCountries();
    return response.success(200, {
      message: 'Countries retrieved successfully',
      data,
    });
  }

  // ── GET /countries/{countryId}/states ────────────────────────
  async getStates(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const { pathParameters } = parseEvent(event);
    const countryIdStr = pathParameters.countryId;
    if (!countryIdStr) {
      throw new AppError('Country ID is required', 400);
    }
    const countryId = parseInt(countryIdStr, 10);
    if (isNaN(countryId)) {
      throw new AppError('Invalid Country ID', 400);
    }

    const data = await locationRepository.findStatesByCountryId(countryId);

    // Include 'state-code' mapping to satisfy JSON payload requirements
    const mappedData = data.map((st) => ({
      ...st,
      'state-code': st.stateCode,
    }));

    return response.success(200, {
      message: 'States retrieved successfully',
      data: mappedData,
    });
  }

  // ── GET /states/{stateId}/districts ──────────────────────────
  async getDistricts(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const { pathParameters } = parseEvent(event);
    const stateIdStr = pathParameters.stateId;
    if (!stateIdStr) {
      throw new AppError('State ID or Code is required', 400);
    }

    let stateId = parseInt(stateIdStr, 10);

    // If it's not a valid number, assume it's a state code (e.g. "JH")
    if (isNaN(stateId)) {
      const state = await locationRepository.findStateByCode(stateIdStr);
      if (!state) {
        throw new AppError('Invalid State Code', 404);
      }
      stateId = state.stateId;
    }

    const data = await locationRepository.findDistrictsByStateId(stateId);
    return response.success(200, {
      message: 'Districts retrieved successfully',
      data,
    });
  }
}

export const locationController = new LocationController();
export default locationController;
