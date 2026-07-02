import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { response } from '../helpers/response';
import { parseEvent } from '../helpers/request';
import { getBSSCAgeLimits, calculateExactAge } from '../utils/age';
import type { LambdaResponse } from '../types';
import { getDb } from '../database/drizzle';
import { categories } from '../database/schema';
import { eq } from 'drizzle-orm';

export class PublicController {
  async getAgeLimits(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    try {
      const { body } = parseEvent(event);
      const { dob, cat_id, gender, isPwd, isExServiceman } = body || {};

      if (!dob) {
        return response.error(400, { message: 'Date of birth is required' });
      }

      let categoryValue = 'unreserved';
      if (cat_id) {
        const db = getDb();
        const categoryRes = await db.select().from(categories).where(eq(categories.catId, Number(cat_id))).limit(1);
        if (categoryRes.length > 0 && categoryRes[0].catValue) {
          categoryValue = categoryRes[0].catValue;
        }
      }

      // Handle DD-MM-YYYY or DD/MM/YYYY format safely
      let dobStr = String(dob);
      if (dobStr.includes('-') && dobStr.split('-')[0].length <= 2) {
        const parts = dobStr.split('-');
        dobStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
      } else if (dobStr.includes('/')) {
        const parts = dobStr.split('/');
        dobStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }

      const parsedDob = new Date(dobStr);
      if (isNaN(parsedDob.getTime())) {
        return response.error(400, { message: 'Invalid date of birth format' });
      }

      const limits = getBSSCAgeLimits(
        (categoryValue as string) || 'unreserved',
        (gender as string) || 'Male',
        isPwd === true || String(isPwd) === 'true',
        isExServiceman === true || String(isExServiceman) === 'true'
      );

      const exactAge = calculateExactAge(parsedDob);

      let isEligible = true;
      let reason = '';

      if (exactAge.years < limits.minAge) {
        isEligible = false;
        reason = 'Under age';
      } else if (
        exactAge.years > limits.maxAge ||
        (exactAge.years === limits.maxAge && (exactAge.months > 0 || exactAge.days > 0))
      ) {
        isEligible = false;
        reason = 'Over age';
      }

      return response.success(200, {
        message: 'Age limits fetched successfully',
        data: {
          minAge: limits.minAge,
          maxAge: limits.maxAge,
          exactAge,
          isEligible,
          reason,
          ageString: `${exactAge.years} years, ${exactAge.months} months, ${exactAge.days} days`
        },
      });
    } catch (error) {
      console.error('Error fetching age limits:', error);
      return response.error(500, { message: 'Failed to calculate age limits' });
    }
  }

  async getCognitoSubId(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    try {
      const { body } = parseEvent(event);
      const email = body?.email;
      const emailStr = email && typeof email === 'string' ? email.trim() : undefined;

      if (!emailStr) {
        return response.error(400, { message: 'Email is required and must be a string' });
      }

      /* COGNITO LOOKUP (REMOVED):
      const { getCognitoUserByEmail } = await import('../utils/cognito');
      const userData = await getCognitoUserByEmail(emailStr);
      if (!userData) return response.error(404, { message: 'User not found' });
      */

      // Check if user exists in the local database
      const db = getDb();
      const { users } = await import('../database/schema');
      const dbUsers = await db.select().from(users).where(eq(users.email, emailStr.toLowerCase())).limit(1);
      const userDbExist = dbUsers.length > 0;

      if (!userDbExist) {
        return response.error(404, { message: 'User not found' });
      }

      return response.success(200, {
        message: 'User retrieved successfully from local database',
        cognitoSubId: dbUsers[0].id,
        userDbExist,
        userData: {
          username: dbUsers[0].email,
          email: dbUsers[0].email,
          name: dbUsers[0].fullName,
        },
      });

    } catch (error) {
      console.error('Error fetching user info:', error);
      return response.error(500, { message: 'Failed to retrieve user info' });
    }
  }
}

export const publicController = new PublicController();
export default publicController;

