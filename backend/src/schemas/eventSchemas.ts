import { z } from 'zod';

export const createEventSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .min(3, 'Title must be at least 3 characters')
    .max(255, 'Title cannot exceed 255 characters')
    .transform((v) => v.trim()),
  description: z.string().max(4000).optional().nullable(),
  category: z.enum(
    ['TECHNICAL', 'CULTURAL', 'WORKSHOP', 'SYMPOSIUM', 'SPORTS', 'ACADEMIC'],
    { required_error: 'Valid event category is required' }
  ),
  departmentId: z.string({ required_error: 'Department ID is required' }).uuid('Invalid Department UUID'),
  organizationId: z.string().uuid('Invalid Organization UUID').optional().nullable(),
  venueId: z.string().uuid('Invalid Venue UUID').optional().nullable(),
  startTime: z.string({ required_error: 'Start time is required' }).datetime('Valid ISO-8601 start time required'),
  endTime: z.string({ required_error: 'End time is required' }).datetime('Valid ISO-8601 end time required'),
  registrationDeadline: z.string({ required_error: 'Registration deadline is required' }).datetime('Valid ISO-8601 registration deadline required'),
  capacity: z.number({ required_error: 'Capacity is required' }).int().positive('Capacity must be greater than 0'),
  budget: z.number().nonnegative('Budget cannot be negative').default(0),
  visibility: z.enum(['UNIVERSITY_WIDE', 'SELECTED_DEPARTMENT', 'PRIVATE']).default('UNIVERSITY_WIDE'),
  allowedDepartments: z.array(z.string().uuid()).optional(),
  allowedBatches: z.array(z.string()).optional(),
  allowedDegreePrograms: z.array(z.string()).optional(),
  allowedAcademicYears: z.array(z.number().int().min(1).max(6)).optional(),
  minCgpa: z.number().min(0).max(10).optional(),
}).refine(
  (data) => new Date(data.startTime) < new Date(data.endTime),
  { message: 'Event start time must be before end time', path: ['endTime'] }
).refine(
  (data) => new Date(data.registrationDeadline) <= new Date(data.startTime),
  { message: 'Registration deadline must be on or before the event start time', path: ['registrationDeadline'] }
);

export const updateEventSchema = z.object({
  title: z.string().min(3).max(255).transform((v) => v.trim()).optional(),
  description: z.string().max(4000).optional().nullable(),
  category: z.enum(['TECHNICAL', 'CULTURAL', 'WORKSHOP', 'SYMPOSIUM', 'SPORTS', 'ACADEMIC']).optional(),
  departmentId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional().nullable(),
  venueId: z.string().uuid().optional().nullable(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  registrationDeadline: z.string().datetime().optional(),
  capacity: z.number().int().positive().optional(),
  budget: z.number().nonnegative().optional(),
  visibility: z.enum(['UNIVERSITY_WIDE', 'SELECTED_DEPARTMENT', 'PRIVATE']).optional(),
  allowedDepartments: z.array(z.string().uuid()).optional(),
  allowedBatches: z.array(z.string()).optional(),
  allowedDegreePrograms: z.array(z.string()).optional(),
  allowedAcademicYears: z.array(z.number().int().min(1).max(6)).optional(),
  minCgpa: z.number().min(0).max(10).optional(),
  // Explicitly disallow status updates through generic PUT
  status: z.never({ invalid_type_error: 'Status cannot be changed directly via generic update endpoint' }).optional(),
}).refine(
  (data) => {
    if (data.startTime && data.endTime) {
      return new Date(data.startTime) < new Date(data.endTime);
    }
    return true;
  },
  { message: 'Event start time must be before end time', path: ['endTime'] }
);

export const reviewDecisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REVISION_REQUESTED', 'REJECTED'], {
    required_error: 'Decision must be APPROVED, REVISION_REQUESTED, or REJECTED',
  }),
  remarks: z
    .string({ required_error: 'Remarks are required for review decisions' })
    .min(3, 'Remarks must be at least 3 characters')
    .max(2000, 'Remarks cannot exceed 2000 characters')
    .transform((v) => v.trim()),
});

export const approvalRemarksSchema = z.object({
  remarks: z
    .string({ required_error: 'Approval remarks are required' })
    .min(3, 'Remarks must be at least 3 characters')
    .max(2000, 'Remarks cannot exceed 2000 characters')
    .transform((v) => v.trim()),
});

export const returnOrRejectSchema = z.object({
  reason: z
    .string({ required_error: 'Reason is required' })
    .min(5, 'Reason must be at least 5 characters')
    .max(2000, 'Reason cannot exceed 2000 characters')
    .transform((v) => v.trim()),
});

export const resubmitEventSchema = z.object({
  changesSummary: z
    .string({ required_error: 'Summary of changes is required for resubmission' })
    .min(5, 'Changes summary must be at least 5 characters')
    .max(2000, 'Changes summary cannot exceed 2000 characters')
    .transform((v) => v.trim()),
});

export const cancelEventSchema = z.object({
  reason: z
    .string({ required_error: 'Cancellation reason is required' })
    .min(5, 'Cancellation reason must be at least 5 characters')
    .max(1000, 'Cancellation reason cannot exceed 1000 characters')
    .transform((v) => v.trim()),
});

export const listEventsQuerySchema = z.object({
  status: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const cancelRegistrationSchema = z.object({
  reason: z.string().max(500).optional(),
});
