"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.policyService = void 0;
const database_1 = require("../config/database");
/**
 * Service for loading and evaluating university policy configurations.
 * Business rules are dynamically read from university_configs table.
 */
class PolicyService {
    cache = new Map();
    CACHE_TTL_MS = 60 * 1000; // 1 minute TTL
    async getConfig(universityId, configKey) {
        const cacheKey = `${universityId}:${configKey}`;
        const cached = this.cache.get(cacheKey);
        if (cached && cached.expiry > Date.now()) {
            return cached.value;
        }
        try {
            const result = await (0, database_1.query)(`SELECT id, university_id, config_key, config_value, description, updated_at
         FROM university_configs
         WHERE university_id = $1 AND config_key = $2
         LIMIT 1`, [universityId, configKey]);
            if (result.rows.length === 0) {
                return null;
            }
            const val = result.rows[0].config_value;
            this.cache.set(cacheKey, { value: val, expiry: Date.now() + this.CACHE_TTL_MS });
            return val;
        }
        catch (err) {
            console.warn(`[PolicyService] Failed to load config ${configKey} for tenant ${universityId}:`, err);
            return null;
        }
    }
    /**
     * Evaluates whether faculty review is required before HOD review for a university.
     * Controlled via the 'approval_workflow' JSON configuration in university_configs.
     * Default: true
     */
    async isFacultyReviewRequired(universityId) {
        const config = await this.getConfig(universityId, 'approval_workflow');
        if (!config) {
            return true; // Default policy requires faculty review
        }
        if (config.require_faculty_review !== undefined) {
            return Boolean(config.require_faculty_review);
        }
        if (Array.isArray(config.default_stages)) {
            return config.default_stages.includes('FACULTY_ADVISOR');
        }
        return true;
    }
    /**
     * Determine required approval stages based on budget threshold.
     */
    async getApprovalStages(universityId, budget) {
        const config = await this.getConfig(universityId, 'approval_workflow');
        const stages = [];
        const facultyRequired = await this.isFacultyReviewRequired(universityId);
        if (facultyRequired) {
            stages.push('FACULTY_ADVISOR');
        }
        stages.push('HOD');
        if (config?.require_dean_if_budget_exceeds && budget > config.require_dean_if_budget_exceeds) {
            stages.push('DEAN');
        }
        return stages;
    }
    /**
     * Evaluates whether students are allowed to cancel an existing event registration.
     * In the Karunya case study baseline, student registration cancellation is disabled.
     * Controlled via the 'registration_policy' JSON configuration.
     * Default: false
     */
    async isRegistrationCancellationAllowed(universityId) {
        const config = await this.getConfig(universityId, 'registration_policy');
        if (!config) {
            return false; // Karunya baseline: cancellation disabled
        }
        return config.allow_student_cancellation ?? false;
    }
    clearCache() {
        this.cache.clear();
    }
}
exports.policyService = new PolicyService();
