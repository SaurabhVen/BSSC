import { eq, and } from 'drizzle-orm';
import { getDb } from '../database/drizzle';
import {
  countries,
  states,
  districts,
  type Country,
  type State,
  type District,
} from '../database/schema';
import { DatabaseError } from '../errors/AppError';

export class LocationRepository {
  // ── Countries ────────────────────────────────────────────────
  async findCountries(isActiveOnly = true): Promise<Country[]> {
    try {
      const db = getDb();
      if (isActiveOnly) {
        return await db.select().from(countries).where(eq(countries.isActive, true));
      }
      return await db.select().from(countries);
    } catch (err) {
      throw new DatabaseError('Failed to fetch countries', err as Error);
    }
  }

  // ── States ───────────────────────────────────────────────────
  async findStatesByCountryId(countryId: number, isActiveOnly = true): Promise<State[]> {
    try {
      const db = getDb();
      const condition = isActiveOnly
        ? and(eq(states.countryId, countryId), eq(states.isActive, true))
        : eq(states.countryId, countryId);

      return await db.select().from(states).where(condition);
    } catch (err) {
      throw new DatabaseError('Failed to fetch states for country', err as Error);
    }
  }

  async findStateByCode(stateCode: string, isActiveOnly = true): Promise<State | undefined> {
    try {
      const db = getDb();
      const condition = isActiveOnly
        ? and(eq(states.stateCode, stateCode), eq(states.isActive, true))
        : eq(states.stateCode, stateCode);

      const [state] = await db.select().from(states).where(condition).limit(1);
      return state;
    } catch (err) {
      throw new DatabaseError('Failed to fetch state by code', err as Error);
    }
  }

  // ── Districts ────────────────────────────────────────────────
  async findDistrictsByStateId(stateId: number, isActiveOnly = true): Promise<District[]> {
    try {
      const db = getDb();
      const condition = isActiveOnly
        ? and(eq(districts.stateId, stateId), eq(districts.isActive, true))
        : eq(districts.stateId, stateId);

      return await db.select().from(districts).where(condition);
    } catch (err) {
      throw new DatabaseError('Failed to fetch districts for state', err as Error);
    }
  }
}

export const locationRepository = new LocationRepository();
export default locationRepository;
