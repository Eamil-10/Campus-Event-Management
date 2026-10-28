import { query } from '../config/database';
import { UniversityConfigRow } from '../models/types';

export interface ApprovalWorkflowConfig {
  require_faculty_review?: boolean;
  default_stages?: string[];
  require_dean_if_budget_exceeds?: number;
  require_dean_if_inter_university?: boolean;
  auto_approve_internal_meeting?: boolean;
}

export interface RegistrationPolicyConfig {
  allow_student_cancellation?: boolean;
  allow_waitlist?: boolean;
  prevent_time_conflict?: boolean;
}

/**
 * Service for loading and evaluating university policy configurations.
 * Business rules are dynamically read from university_configs table.
 */
class PolicyService {
  private cache = new Map<string, { value: any; expiry: number }>();
  private readonly CACHE_TTL_MS = 60 * 1000; // 1 minute TTL

  async getConfig<T = Record<string, unknown>>(
    universityId: string,
    configKey: string
  ): Promise<T | null> {
    const cacheKey = `${universityId}:${configKey}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.value as T;
    }

    try {
      const result = await query<UniversityConfigRow>(
        `SELECT id, university_id, config_key, config_value, description, updated_at
         FROM university_configs
         WHERE university_id = $1 AND config_key = $2
         LIMIT 1`,
        [universityId, configKey]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const val = result.rows[0].config_value as T;
      this.cache.set(cacheKey, { value: val, expiry: Date.now() + this.CACHE_TTL_MS });
      return val;
    } catch (err) {
      console.warn(`[PolicyService] Failed to load config ${configKey} for tenant ${universityId}:`, err);
      return null;
    }
  }

  /**
   * Evaluates whether faculty review is required before HOD review for a university.
   * Controlled via the 'approval_workflow' JSON configuration in university_configs.
   * Default: true
   */
  async isFacultyReviewRequired(universityId: string): Promise<boolean> {
    const config = await this.getConfig<ApprovalWorkflowConfig>(universityId, 'approval_workflow');
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
  async getApprovalStages(universityId: string, budget: number): Promise<string[]> {
    const config = await this.getConfig<ApprovalWorkflowConfig>(universityId, 'approval_workflow');
    const stages: string[] = [];

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
   * Controlled via the 'registration_policy' JSON configuration per university.
   * Default: false (conservative — disabling requires explicit configuration opt-in).
   */
  async isRegistrationCancellationAllowed(universityId: string): Promise<boolean> {
    const config = await this.getConfig<RegistrationPolicyConfig>(universityId, 'registration_policy');
    if (!config) {
      return false; // Default: cancellation disabled unless explicitly enabled
    }
    return config.allow_student_cancellation ?? false;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const policyService = new PolicyService();
