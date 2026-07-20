import { z } from 'zod';

export const getPaidCandidateSchema = z.object({
  regId: z.coerce.number({
    required_error: 'Registration ID (regId) is required',
    invalid_type_error: 'Registration ID must be a number',
  }).int().positive('Registration ID must be a positive integer'),
  fathername: z.string({
    required_error: "Father's name is required",
  }).trim().min(1, "Father's name is required"),
  mothername: z.string({
    required_error: "Mother's name is required",
  }).trim().min(1, "Mother's name is required"),
  fullname: z.string().trim().optional(),
});
