import { useEffect, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";

// Feature names matching server-side constants
export const FEATURES = {
  RESUME_BUILDER: "resume_builder",
  ATS_SCANNER: "ats_scanner",
  COVER_LETTER: "cover_letter",
  JOB_MATCH: "job_match",
  TAILOR: "tailor",
} as const;

/**
 * Hook to track when a user visits/uses a feature
 * Call this at the top of feature pages/components
 */
export function useFeatureTracking(featureName: string) {
  const tracked = useRef(false);

  useEffect(() => {
    // Only track once per session
    if (!tracked.current) {
      tracked.current = true;
      
      // Track feature usage in background
      apiRequest("POST", "/api/track-feature", { featureName })
        .catch(err => {
          console.error("Failed to track feature usage:", err);
        });
    }
  }, [featureName]);
}
