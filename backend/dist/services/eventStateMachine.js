"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventStateMachine = exports.EventStateMachine = void 0;
const errors_1 = require("../utils/errors");
/**
 * Centralized State Machine for University Event Proposals and Lifecycle.
 * Enforces legal transitions, actor permissions, HOD self-approval prevention,
 * and immutable history side-effects.
 */
class EventStateMachine {
    /**
     * Evaluates if a transition is legal for the given event, actor, and action.
     * Throws BadRequestError for illegal state transitions or ForbiddenError for unauthorized actors.
     */
    transition(action, ctx) {
        const { event, actor, facultyReviewRequired = true } = ctx;
        const current = event.status;
        switch (action) {
            case 'SUBMIT': {
                if (current !== 'DRAFT') {
                    throw new errors_1.BadRequestError(`Cannot submit proposal from status '${current}'. Only DRAFT events can be submitted.`);
                }
                // Verify actor is the organizer or system/university admin
                const isOrganizer = event.organizer_id === actor.id;
                const isAdmin = actor.roles.some((r) => r.role === 'SYSTEM_ADMIN' || r.role === 'UNIVERSITY_ADMIN');
                if (!isOrganizer && !isAdmin) {
                    throw new errors_1.ForbiddenError('Only the event organizer or an administrator can submit this proposal.');
                }
                const nextStatus = facultyReviewRequired
                    ? 'PENDING_FACULTY_REVIEW'
                    : 'UNDER_HOD_REVIEW';
                return { fromStatus: current, toStatus: nextStatus, action };
            }
            case 'FACULTY_APPROVE': {
                if (current !== 'PENDING_FACULTY_REVIEW') {
                    throw new errors_1.BadRequestError(`Cannot perform faculty review on event with status '${current}'. Expected PENDING_FACULTY_REVIEW.`);
                }
                this.validateFacultyReviewer(event, actor);
                return {
                    fromStatus: current,
                    toStatus: 'UNDER_HOD_REVIEW',
                    action,
                    stage: 'FACULTY_ADVISOR',
                    decision: 'APPROVED',
                };
            }
            case 'FACULTY_RETURN': {
                if (current !== 'PENDING_FACULTY_REVIEW') {
                    throw new errors_1.BadRequestError(`Cannot return event from status '${current}'. Expected PENDING_FACULTY_REVIEW.`);
                }
                this.validateFacultyReviewer(event, actor);
                return {
                    fromStatus: current,
                    toStatus: 'DRAFT',
                    action,
                    stage: 'FACULTY_ADVISOR',
                    decision: 'REVISION_REQUESTED',
                };
            }
            case 'FACULTY_REJECT': {
                if (current !== 'PENDING_FACULTY_REVIEW') {
                    throw new errors_1.BadRequestError(`Cannot reject event from status '${current}'. Expected PENDING_FACULTY_REVIEW.`);
                }
                this.validateFacultyReviewer(event, actor);
                return {
                    fromStatus: current,
                    toStatus: 'REJECTED',
                    action,
                    stage: 'FACULTY_ADVISOR',
                    decision: 'REJECTED',
                };
            }
            case 'HOD_APPROVE': {
                if (current !== 'UNDER_HOD_REVIEW') {
                    throw new errors_1.BadRequestError(`Cannot approve event from status '${current}'. Expected UNDER_HOD_REVIEW.`);
                }
                this.validateHodReviewer(event, actor);
                return {
                    fromStatus: current,
                    toStatus: 'APPROVED',
                    action,
                    stage: 'HOD',
                    decision: 'APPROVED',
                };
            }
            case 'HOD_RETURN': {
                if (current !== 'UNDER_HOD_REVIEW') {
                    throw new errors_1.BadRequestError(`Cannot return event from status '${current}'. Expected UNDER_HOD_REVIEW.`);
                }
                this.validateHodReviewer(event, actor);
                return {
                    fromStatus: current,
                    toStatus: 'DRAFT',
                    action,
                    stage: 'HOD',
                    decision: 'REVISION_REQUESTED',
                };
            }
            case 'HOD_REJECT': {
                if (current !== 'UNDER_HOD_REVIEW') {
                    throw new errors_1.BadRequestError(`Cannot reject event from status '${current}'. Expected UNDER_HOD_REVIEW.`);
                }
                this.validateHodReviewer(event, actor);
                return {
                    fromStatus: current,
                    toStatus: 'REJECTED',
                    action,
                    stage: 'HOD',
                    decision: 'REJECTED',
                };
            }
            case 'OPEN_REGISTRATION': {
                if (current !== 'APPROVED' && current !== 'REGISTRATION_CLOSED') {
                    throw new errors_1.BadRequestError(`Registration can only be opened for APPROVED or REGISTRATION_CLOSED events. Current: ${current}`);
                }
                this.validateLifecycleActor(event, actor);
                return { fromStatus: current, toStatus: 'REGISTRATION_OPEN', action };
            }
            case 'CLOSE_REGISTRATION': {
                if (current !== 'REGISTRATION_OPEN') {
                    throw new errors_1.BadRequestError(`Registration can only be closed from REGISTRATION_OPEN. Current: ${current}`);
                }
                this.validateLifecycleActor(event, actor);
                return { fromStatus: current, toStatus: 'REGISTRATION_CLOSED', action };
            }
            case 'START_EVENT': {
                const validStates = ['APPROVED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED'];
                if (!validStates.includes(current)) {
                    throw new errors_1.BadRequestError(`Event cannot be marked ONGOING from status '${current}'.`);
                }
                this.validateLifecycleActor(event, actor);
                return { fromStatus: current, toStatus: 'ONGOING', action };
            }
            case 'COMPLETE_EVENT': {
                if (current !== 'ONGOING') {
                    throw new errors_1.BadRequestError(`Event can only be completed when ONGOING. Current: ${current}`);
                }
                this.validateLifecycleActor(event, actor);
                return { fromStatus: current, toStatus: 'COMPLETED', action };
            }
            case 'CANCEL': {
                const nonCancellable = ['COMPLETED', 'REJECTED', 'CANCELLED'];
                if (nonCancellable.includes(current)) {
                    throw new errors_1.BadRequestError(`Cannot cancel an event that is already ${current}.`);
                }
                // Organizer, HOD, or Administrator can cancel
                const isOrganizer = event.organizer_id === actor.id;
                const isHod = actor.roles.some((r) => r.role === 'HOD' && (!r.departmentId || r.departmentId === event.department_id));
                const isAdmin = actor.roles.some((r) => r.role === 'SYSTEM_ADMIN' || r.role === 'UNIVERSITY_ADMIN');
                if (!isOrganizer && !isHod && !isAdmin) {
                    throw new errors_1.ForbiddenError('Only the organizer, department HOD, or an administrator can cancel this event.');
                }
                return { fromStatus: current, toStatus: 'CANCELLED', action };
            }
            default:
                throw new errors_1.BadRequestError(`Unsupported workflow action: ${action}`);
        }
    }
    /**
     * Validates that the actor is authorized to perform Faculty Coordinator review.
     * Prevents self-review if faculty created the event.
     */
    validateFacultyReviewer(event, actor) {
        const isAdmin = actor.roles.some((r) => r.role === 'SYSTEM_ADMIN' || r.role === 'UNIVERSITY_ADMIN');
        if (isAdmin)
            return;
        // Faculty review permission check
        const hasFacultyRole = actor.roles.some((r) => r.role === 'FACULTY_ADVISOR' && (!r.departmentId || r.departmentId === event.department_id));
        if (!hasFacultyRole) {
            throw new errors_1.ForbiddenError('Only a Faculty Advisor from the event department can review this proposal.');
        }
        // Prevention of self-review
        if (event.organizer_id === actor.id) {
            throw new errors_1.ForbiddenError('Self-review violation: An organizer cannot review their own event proposal.');
        }
    }
    /**
     * Validates that the actor is authorized to perform HOD approval.
     * Strictly enforces HOD self-approval prevention.
     */
    validateHodReviewer(event, actor) {
        const isAdmin = actor.roles.some((r) => r.role === 'SYSTEM_ADMIN' || r.role === 'UNIVERSITY_ADMIN');
        if (isAdmin)
            return;
        // Must hold HOD role for event department
        const isHodOfDept = actor.roles.some((r) => r.role === 'HOD' && (!r.departmentId || r.departmentId === event.department_id));
        if (!isHodOfDept) {
            throw new errors_1.ForbiddenError('Only the Head of Department (HOD) for this department can approve or reject this proposal.');
        }
        // CRITICAL: Prevent HOD self-approval
        if (event.organizer_id === actor.id) {
            throw new errors_1.ForbiddenError('HOD Self-Approval Prevention: As the event organizer, you cannot approve your own proposal. Another authorized official must review it.');
        }
    }
    /**
     * Validates actor for lifecycle management (registration control, starting, completing).
     */
    validateLifecycleActor(event, actor) {
        const isOrganizer = event.organizer_id === actor.id;
        const isHod = actor.roles.some((r) => r.role === 'HOD' && (!r.departmentId || r.departmentId === event.department_id));
        const isFaculty = actor.roles.some((r) => r.role === 'FACULTY_ADVISOR' && (!r.departmentId || r.departmentId === event.department_id));
        const isAdmin = actor.roles.some((r) => r.role === 'SYSTEM_ADMIN' || r.role === 'UNIVERSITY_ADMIN');
        if (!isOrganizer && !isHod && !isFaculty && !isAdmin) {
            throw new errors_1.ForbiddenError('You do not have permission to manage the lifecycle of this event.');
        }
    }
}
exports.EventStateMachine = EventStateMachine;
exports.eventStateMachine = new EventStateMachine();
