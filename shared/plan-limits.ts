import type { PlanType } from "@shared/schema";

export type PlanLimitValue = number;

export interface PlanLimitSet {
  maxResumes: PlanLimitValue;
  maxSkills: PlanLimitValue;
  maxAIEditsPerMonth: PlanLimitValue;
  maxCoverLettersPerMonth: PlanLimitValue;
  maxJobImportsPerMonth: PlanLimitValue;
  maxJobMatchScansPerMonth: PlanLimitValue;
  maxJobsPerJobMatchScan: PlanLimitValue;
  maxResumeReviewsPerMonth: PlanLimitValue;
  maxATSScansPerMonth: PlanLimitValue;
  // Legacy aliases kept for compatibility while we normalize product wording.
  maxImportedResumesPerMonth: PlanLimitValue;
  maxJobAnalysesPerMonth: PlanLimitValue;
}

const withAliases = (limits: Omit<PlanLimitSet, "maxImportedResumesPerMonth" | "maxJobAnalysesPerMonth">): PlanLimitSet => ({
  ...limits,
  maxImportedResumesPerMonth: limits.maxJobImportsPerMonth,
  maxJobAnalysesPerMonth: limits.maxJobMatchScansPerMonth,
});

export const PLAN_LIMITS: Record<PlanType, PlanLimitSet> = {
  free: withAliases({
    maxResumes: 1,
    maxSkills: 8,
    maxAIEditsPerMonth: 6,
    maxCoverLettersPerMonth: 2,
    maxJobImportsPerMonth: 1,
    maxJobMatchScansPerMonth: 1,
    maxJobsPerJobMatchScan: 3,
    maxResumeReviewsPerMonth: 1,
    maxATSScansPerMonth: 2,
  }),
  plus: withAliases({
    maxResumes: 5,
    maxSkills: 50,
    maxAIEditsPerMonth: 60,
    maxCoverLettersPerMonth: 20,
    maxJobImportsPerMonth: 5,
    maxJobMatchScansPerMonth: 10,
    maxJobsPerJobMatchScan: 20,
    maxResumeReviewsPerMonth: 8,
    maxATSScansPerMonth: 20,
  }),
  ultra: withAliases({
    maxResumes: Infinity,
    maxSkills: Infinity,
    maxAIEditsPerMonth: Infinity,
    maxCoverLettersPerMonth: Infinity,
    maxJobImportsPerMonth: Infinity,
    maxJobMatchScansPerMonth: 50,
    maxJobsPerJobMatchScan: 50,
    maxResumeReviewsPerMonth: 30,
    maxATSScansPerMonth: Infinity,
  }),
  lifetime: withAliases({
    maxResumes: Infinity,
    maxSkills: Infinity,
    maxAIEditsPerMonth: Infinity,
    maxCoverLettersPerMonth: Infinity,
    maxJobImportsPerMonth: Infinity,
    maxJobMatchScansPerMonth: 50,
    maxJobsPerJobMatchScan: 50,
    maxResumeReviewsPerMonth: 30,
    maxATSScansPerMonth: Infinity,
  }),
};

export const LIMIT_METRIC_LABELS = {
  maxResumes: "resumes",
  maxSkills: "skills",
  maxAIEditsPerMonth: "AI edits",
  maxCoverLettersPerMonth: "cover letters",
  maxJobImportsPerMonth: "job imports",
  maxJobMatchScansPerMonth: "job match scans",
  maxJobsPerJobMatchScan: "jobs per match",
  maxResumeReviewsPerMonth: "resume reviews",
  maxATSScansPerMonth: "ATS scans",
  maxImportedResumesPerMonth: "job imports",
  maxJobAnalysesPerMonth: "job match scans",
} as const;

export type LimitMetricKey = keyof typeof LIMIT_METRIC_LABELS;

export const LIMIT_METRIC_ALIASES: Record<string, LimitMetricKey> = {
  maxImportedResumesPerMonth: "maxJobImportsPerMonth",
  maxJobAnalysesPerMonth: "maxJobMatchScansPerMonth",
};

export const resolveLimitMetricKey = (metric: string): LimitMetricKey => {
  return (LIMIT_METRIC_ALIASES[metric] ?? metric) as LimitMetricKey;
};

export const formatLimitValue = (value: number) => (value === Infinity ? "Unlimited" : `${value}`);
