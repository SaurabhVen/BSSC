import type { APIGatewayProxyEventV2 } from 'aws-lambda';
<<<<<<< HEAD
import { response } from '../helpers/response';
import { parseEvent } from '../helpers/request';
import { getBSSCAgeLimits, calculateExactAge } from '../utils/age';
import type { LambdaResponse } from '../types';
import { getDb } from '../database/drizzle';
import { categories } from '../database/schema';
import { eq } from 'drizzle-orm';
=======
import axios from 'axios';
import { response } from '../helpers/response';
import { parseEvent } from '../helpers/request';
import { getBSSCAgeLimits, calculateExactAge, checkBSSCEligibility } from '../utils/age';
import type { LambdaResponse } from '../types';
import { getDb } from '../database/drizzle';
import { categories, typeOfExOfficers, users } from '../database/schema';
import { eq } from 'drizzle-orm';
import { DatabaseError } from '../errors/AppError';


>>>>>>> b5d3be6e099ba6bac81a614738a5b4b0d8414e74

export class PublicController {
  async getAgeLimits(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    try {
      const { body } = parseEvent(event);
<<<<<<< HEAD
      const { dob, cat_id, gender, isPwd, isExServiceman } = body || {};
=======
      const {
        dob,
        cat_id,
        gender,
        isPwd,
        isExServiceman,
        exServicemanYears,
        isGovtServant,
        isCommissionedOfficer,
        qualificationYear,
        passingYear,
        qualificationDate
      } = body || {};
>>>>>>> b5d3be6e099ba6bac81a614738a5b4b0d8414e74

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

<<<<<<< HEAD
=======
      let qualifiedPre2022 = false;
      const qualYear = qualificationYear || passingYear;
      if (qualYear) {
        qualifiedPre2022 = Number(qualYear) <= 2022;
      } else if (qualificationDate) {
        const qDate = new Date(qualificationDate as any);
        if (!isNaN(qDate.getTime())) {
          qualifiedPre2022 = qDate.getTime() <= new Date('2022-08-01').getTime();
        }
      }

>>>>>>> b5d3be6e099ba6bac81a614738a5b4b0d8414e74
      const limits = getBSSCAgeLimits(
        (categoryValue as string) || 'unreserved',
        (gender as string) || 'Male',
        isPwd === true || String(isPwd) === 'true',
<<<<<<< HEAD
        isExServiceman === true || String(isExServiceman) === 'true'
      );

      const exactAge = calculateExactAge(parsedDob);
=======
        isExServiceman === true || String(isExServiceman) === 'true',
        Number(exServicemanYears || 0),
        isGovtServant === true || String(isGovtServant) === 'true',
        isCommissionedOfficer === true || String(isCommissionedOfficer) === 'true'
      );

      const exactAge = calculateExactAge(parsedDob, '2025-08-01');

      // Reference date for ex-serviceman check is time of application (current date)
      const refDateForMax = (isExServiceman === true || String(isExServiceman) === 'true')
        ? new Date()
        : new Date('2025-08-01');

      const isMinAgeEligible = checkBSSCEligibility(parsedDob, limits.minAge, 150, '2025-08-01');
      const isMaxAgeEligibleBase = checkBSSCEligibility(parsedDob, 0, limits.maxAge, refDateForMax);
      const isMaxAgeEligibleCarryForward = checkBSSCEligibility(parsedDob, 0, limits.maxAge, '2022-08-01') && qualifiedPre2022;
>>>>>>> b5d3be6e099ba6bac81a614738a5b4b0d8414e74

      let isEligible = true;
      let reason = '';

<<<<<<< HEAD
      if (exactAge.years < limits.minAge) {
        isEligible = false;
        reason = 'Under age';
      } else if (
        exactAge.years > limits.maxAge ||
        (exactAge.years === limits.maxAge && (exactAge.months > 0 || exactAge.days > 0))
      ) {
=======
      if (!isMinAgeEligible) {
        isEligible = false;
        reason = 'Under age';
      } else if (!isMaxAgeEligibleBase && !isMaxAgeEligibleCarryForward) {
>>>>>>> b5d3be6e099ba6bac81a614738a5b4b0d8414e74
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

<<<<<<< HEAD
      /* COGNITO LOOKUP (REMOVED):
      const { getCognitoUserByEmail } = await import('../utils/cognito');
      const userData = await getCognitoUserByEmail(emailStr);
      if (!userData) return response.error(404, { message: 'User not found' });
      */
=======
      // Fetch directly from Cognito

      const { getCognitoUserByEmail } = await import('../utils/cognito');
      const userData = await getCognitoUserByEmail(emailStr);

      if (!userData) {
        return response.error(404, { message: 'User not found' });
      }
>>>>>>> b5d3be6e099ba6bac81a614738a5b4b0d8414e74

      // Check if user exists in the local database
      const db = getDb();
      const { users } = await import('../database/schema');
      const dbUsers = await db.select().from(users).where(eq(users.email, emailStr.toLowerCase())).limit(1);
      const userDbExist = dbUsers.length > 0;

<<<<<<< HEAD
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
=======
      return response.success(200, {
        message: 'Cognito user retrieved successfully',
        cognitoSubId: userData.sub || userData.username || null,
        userDbExist,
        userData,
      });

    } catch (error) {
      console.error('Error fetching cognito sub id:', error);
      return response.error(500, { message: 'Failed to retrieve Cognito sub ID' });
    }
  }

  async listTypeOfExOfficers(_event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    try {
      const db = getDb();

      // Select all ex-officer types from the DB
      const list = await db.select().from(typeOfExOfficers).orderBy(typeOfExOfficers.id);
      return response.success(200, {
        message: 'Ex-Officer types fetched successfully',
        data: list.map((item) => ({
          value: item.id,
          label: item.name,
        })),
        total: list.length,
      });
    } catch (err) {
      throw new DatabaseError('Failed to fetch ex-officer types', err as Error);
    }
  }

  async getIpAddress(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    try {
      const { data } = await axios.get('https://checkip.amazonaws.com');
      const publicIp = typeof data === 'string' ? data.trim() : '';

      return response.success(200, {
        message: 'IP address retrieved successfully',
        data: {
          ip: publicIp
        }
      });
    } catch (error) {
      console.error('Error fetching IP address:', error);
      return response.error(500, { message: 'Failed to retrieve IP address' });
    }
  }

>>>>>>> b5d3be6e099ba6bac81a614738a5b4b0d8414e74
}

export const publicController = new PublicController();
export default publicController;

