import { PLAN_LIMITS, type LimitMetricKey, LIMIT_METRIC_LABELS } from "@shared/plan-limits";
import type { PlanType } from "@shared/schema";

export type UsageThresholdStage = "normal" | "notice_70" | "cta_90" | "blocked_100" | "unlimited";
export type UsageFeatureKey = "ai_edits" | "cover_letters" | "ats_scans";

const FEATURE_METRICS: Record<UsageFeatureKey, LimitMetricKey> = {
  ai_edits: "maxAIEditsPerMonth",
  cover_letters: "maxCoverLettersPerMonth",
  ats_scans: "maxATSScansPerMonth",
};

const THRESHOLDS = {
  notice: 0.7,
  cta: 0.9,
  blocked: 1,
} as const;

function getNextPlan(plan: PlanType): PlanType {
  if (plan === "free") return "plus";
  if (plan === "plus") return "ultra";
  return plan;
}

export function getFeatureMetricKey(feature: UsageFeatureKey): LimitMetricKey {
  return FEATURE_METRICS[feature];
}

export function buildUsageThresholdState(input: {
  feature: UsageFeatureKey;
  plan: PlanType;
  currentUsage: number;
  currentLimit: number;
}) {
  const { feature, plan, currentUsage, currentLimit } = input;
  const metricKey = getFeatureMetricKey(feature);
  const metricLabel = LIMIT_METRIC_LABELS[metricKey];

  if (currentLimit === Infinity || currentLimit <= 0) {
    return {
      feature,
      metricKey,
      metricLabel,
      stage: "unlimited" as UsageThresholdStage,
      percentage: 0,
      showNotice: false,
      blocksAction: false,
      recommendedPlan: null,
      unlockedAmount: null,
      currentUsage,
      currentLimit,
    };
  }

  const percentage = Math.min(1, currentUsage / currentLimit);
  const stage: UsageThresholdStage =
    percentage >= THRESHOLDS.blocked
      ? "blocked_100"
      : percentage >= THRESHOLDS.cta
        ? "cta_90"
        : percentage >= THRESHOLDS.notice
          ? "notice_70"
          : "normal";

  const recommendedPlan = getNextPlan(plan);
  const recommendedLimit = PLAN_LIMITS[recommendedPlan][metricKey];
  const unlockedAmount =
    recommendedLimit === Infinity
      ? "unlimited"
      : Math.max(0, recommendedLimit - currentLimit);

  return {
    feature,
    metricKey,
    metricLabel,
    stage,
    percentage,
    showNotice: stage === "notice_70" || stage === "cta_90",
    blocksAction: stage === "blocked_100",
    recommendedPlan,
    currentUsage,
    currentLimit,
    recommendedLimit,
    unlockedAmount,
    messages: {
      notice70: `You're getting close to your monthly ${metricLabel} limit.`,
      cta90: `You're almost out of ${metricLabel} this month. Compare plans to avoid interruptions.`,
      blocked100: `You've reached your monthly ${metricLabel} limit. Upgrade to continue.`,
    },
  };
}
