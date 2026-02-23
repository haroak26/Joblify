import type { PlanType } from "@shared/schema";

export type PlanLimitValue = number;

export interface PlanLimitSet {
  maxResumes: PlanLimitValue;
  maxSkills: PlanLimitValue;
  maxAIEditsPerMonth: PlanLimitValue;
  maxAIBuilderActionsPerMonth: PlanLimitValue;
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
    maxAIEditsPerMonth: 0,
    maxAIBuilderActionsPerMonth: 0,
    maxCoverLettersPerMonth: 0,
    maxJobImportsPerMonth: 5,
    maxJobMatchScansPerMonth: 0,
    maxJobsPerJobMatchScan: 0,
    maxResumeReviewsPerMonth: 0,
    maxATSScansPerMonth: 1,
  }),
  student: withAliases({
    maxResumes: 5,
    maxSkills: 20,
    maxAIEditsPerMonth: 50,
    maxAIBuilderActionsPerMonth: 50,
    maxCoverLettersPerMonth: 25,
    maxJobImportsPerMonth: Infinity,
    maxJobMatchScansPerMonth: 0,
    maxJobsPerJobMatchScan: 0,
    maxResumeReviewsPerMonth: 25,
    maxATSScansPerMonth: 10,
  }),
  plus: withAliases({
    maxResumes: 20,
    maxSkills: 50,
    maxAIEditsPerMonth: Infinity,
    maxAIBuilderActionsPerMonth: 50,
    maxCoverLettersPerMonth: 50,
    maxJobImportsPerMonth: Infinity,
    maxJobMatchScansPerMonth: 0,
    maxJobsPerJobMatchScan: 0,
    maxResumeReviewsPerMonth: 50,
    maxATSScansPerMonth: Infinity,
  }),
  ultra: withAliases({
    maxResumes: Infinity,
    maxSkills: Infinity,
    maxAIEditsPerMonth: Infinity,
    maxAIBuilderActionsPerMonth: 100,
    maxCoverLettersPerMonth: 100,
    maxJobImportsPerMonth: Infinity,
    maxJobMatchScansPerMonth: 0,
    maxJobsPerJobMatchScan: 0,
    maxResumeReviewsPerMonth: 100,
    maxATSScansPerMonth: Infinity,
  }),
  lifetime: withAliases({
    maxResumes: Infinity,
    maxSkills: Infinity,
    maxAIEditsPerMonth: Infinity,
    maxAIBuilderActionsPerMonth: Infinity,
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
  maxAIBuilderActionsPerMonth: "AI builder actions",
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
