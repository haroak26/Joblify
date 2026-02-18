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
    maxSkills: 10,
    maxAIEditsPerMonth: 10,
    maxCoverLettersPerMonth: 5,
    maxJobImportsPerMonth: 1,
    maxJobMatchScansPerMonth: 2,
    maxJobsPerJobMatchScan: 5,
    maxResumeReviewsPerMonth: 1,
    maxATSScansPerMonth: 5,
  }),
  plus: withAliases({
    maxResumes: 5,
    maxSkills: Infinity,
    maxAIEditsPerMonth: 100,
    maxCoverLettersPerMonth: 50,
    maxJobImportsPerMonth: 10,
    maxJobMatchScansPerMonth: 5,
    maxJobsPerJobMatchScan: 20,
    maxResumeReviewsPerMonth: 10,
    maxATSScansPerMonth: 50,
  }),
  ultra: withAliases({
    maxResumes: Infinity,
    maxSkills: Infinity,
    maxAIEditsPerMonth: Infinity,
    maxCoverLettersPerMonth: Infinity,
    maxJobImportsPerMonth: Infinity,
    maxJobMatchScansPerMonth: 50,
    maxJobsPerJobMatchScan: 50,
    maxResumeReviewsPerMonth: 50,
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
    maxResumeReviewsPerMonth: 50,
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
