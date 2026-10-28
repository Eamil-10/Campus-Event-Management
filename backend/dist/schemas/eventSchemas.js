"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelRegistrationSchema = exports.listEventsQuerySchema = exports.cancelEventSchema = exports.resubmitEventSchema = exports.returnOrRejectSchema = exports.approvalRemarksSchema = exports.reviewDecisionSchema = exports.updateEventSchema = exports.createEventSchema = void 0;
const zod_1 = require("zod");
exports.createEventSchema = zod_1.z.object({
    title: zod_1.z
        .string({ required_error: 'Title is required' })
        .min(3, 'Title must be at least 3 characters')
        .max(255, 'Title cannot exceed 255 characters')
        .transform((v) => v.trim()),
    description: zod_1.z.string().max(4000).optional().nullable(),
    category: zod_1.z.enum(['TECHNICAL', 'CULTURAL', 'WORKSHOP', 'SYMPOSIUM', 'SPORTS', 'ACADEMIC'], { required_error: 'Valid event category is required' }),
    departmentId: zod_1.z.string({ required_error: 'Department ID is required' }).uuid('Invalid Department UUID'),
    organizationId: zod_1.z.string().uuid('Invalid Organization UUID').optional().nullable(),
    venueId: zod_1.z.string().uuid('Invalid Venue UUID').optional().nullable(),
    startTime: zod_1.z.string({ required_error: 'Start time is required' }).datetime('Valid ISO-8601 start time required'),
    endTime: zod_1.z.string({ required_error: 'End time is required' }).datetime('Valid ISO-8601 end time required'),
    registrationDeadline: zod_1.z.string({ required_error: 'Registration deadline is required' }).datetime('Valid ISO-8601 registration deadline required'),
    capacity: zod_1.z.number({ required_error: 'Capacity is required' }).int().positive('Capacity must be greater than 0'),
    budget: zod_1.z.number().nonnegative('Budget cannot be negative').default(0),
    visibility: zod_1.z.enum(['UNIVERSITY_WIDE', 'SELECTED_DEPARTMENT', 'PRIVATE']).default('UNIVERSITY_WIDE'),
    allowedDepartments: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    allowedBatches: zod_1.z.array(zod_1.z.string()).optional(),
    allowedDegreePrograms: zod_1.z.array(zod_1.z.string()).optional(),
    allowedAcademicYears: zod_1.z.array(zod_1.z.number().int().min(1).max(6)).optional(),
    minCgpa: zod_1.z.number().min(0).max(10).optional(),
}).refine((data) => new Date(data.startTime) < new Date(data.endTime), { message: 'Event start time must be before end time', path: ['endTime'] }).refine((data) => new Date(data.registrationDeadline) <= new Date(data.startTime), { message: 'Registration deadline must be on or before the event start time', path: ['registrationDeadline'] });
exports.updateEventSchema = zod_1.z.object({
    title: zod_1.z.string().min(3).max(255).transform((v) => v.trim()).optional(),
    description: zod_1.z.string().max(4000).optional().nullable(),
    category: zod_1.z.enum(['TECHNICAL', 'CULTURAL', 'WORKSHOP', 'SYMPOSIUM', 'SPORTS', 'ACADEMIC']).optional(),
    departmentId: zod_1.z.string().uuid().optional(),
    organizationId: zod_1.z.string().uuid().optional().nullable(),
    venueId: zod_1.z.string().uuid().optional().nullable(),
    startTime: zod_1.z.string().datetime().optional(),
    endTime: zod_1.z.string().datetime().optional(),
    registrationDeadline: zod_1.z.string().datetime().optional(),
    capacity: zod_1.z.number().int().positive().optional(),
    budget: zod_1.z.number().nonnegative().optional(),
    visibility: zod_1.z.enum(['UNIVERSITY_WIDE', 'SELECTED_DEPARTMENT', 'PRIVATE']).optional(),
    allowedDepartments: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    allowedBatches: zod_1.z.array(zod_1.z.string()).optional(),
    allowedDegreePrograms: zod_1.z.array(zod_1.z.string()).optional(),
    allowedAcademicYears: zod_1.z.array(zod_1.z.number().int().min(1).max(6)).optional(),
    minCgpa: zod_1.z.number().min(0).max(10).optional(),
    // Explicitly disallow status updates through generic PUT
    status: zod_1.z.never({ invalid_type_error: 'Status cannot be changed directly via generic update endpoint' }).optional(),
}).refine((data) => {
    if (data.startTime && data.endTime) {
        return new Date(data.startTime) < new Date(data.endTime);
    }
    return true;
}, { message: 'Event start time must be before end time', path: ['endTime'] });
exports.reviewDecisionSchema = zod_1.z.object({
    decision: zod_1.z.enum(['APPROVED', 'REVISION_REQUESTED', 'REJECTED'], {
        required_error: 'Decision must be APPROVED, REVISION_REQUESTED, or REJECTED',
    }),
    remarks: zod_1.z
        .string({ required_error: 'Remarks are required for review decisions' })
        .min(3, 'Remarks must be at least 3 characters')
        .max(2000, 'Remarks cannot exceed 2000 characters')
        .transform((v) => v.trim()),
});
exports.approvalRemarksSchema = zod_1.z.object({
    remarks: zod_1.z
        .string({ required_error: 'Approval remarks are required' })
        .min(3, 'Remarks must be at least 3 characters')
        .max(2000, 'Remarks cannot exceed 2000 characters')
        .transform((v) => v.trim()),
});
exports.returnOrRejectSchema = zod_1.z.object({
    reason: zod_1.z
        .string({ required_error: 'Reason is required' })
        .min(5, 'Reason must be at least 5 characters')
        .max(2000, 'Reason cannot exceed 2000 characters')
        .transform((v) => v.trim()),
});
exports.resubmitEventSchema = zod_1.z.object({
    changesSummary: zod_1.z
        .string({ required_error: 'Summary of changes is required for resubmission' })
        .min(5, 'Changes summary must be at least 5 characters')
        .max(2000, 'Changes summary cannot exceed 2000 characters')
        .transform((v) => v.trim()),
});
exports.cancelEventSchema = zod_1.z.object({
    reason: zod_1.z
        .string({ required_error: 'Cancellation reason is required' })
        .min(5, 'Cancellation reason must be at least 5 characters')
        .max(1000, 'Cancellation reason cannot exceed 1000 characters')
        .transform((v) => v.trim()),
});
exports.listEventsQuerySchema = zod_1.z.object({
    status: zod_1.z.string().optional(),
    departmentId: zod_1.z.string().uuid().optional(),
    category: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(50),
    offset: zod_1.z.coerce.number().int().min(0).default(0),
});
exports.cancelRegistrationSchema = zod_1.z.object({
    reason: zod_1.z.string().max(500).optional(),
});
