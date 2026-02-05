import posthog from 'posthog-js';

// Initialize PostHog
export function initializeAnalytics() {
  const apiKey = import.meta.env.VITE_POSTHOG_API_KEY;
  const host = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';

  if (apiKey && typeof window !== 'undefined') {
    posthog.init(apiKey, {
      api_host: host,
      autocapture: false, // We'll track events manually for better control
      capture_pageview: false, // We'll track page views manually
      disable_session_recording: false,
      loaded: (posthog) => {
        if (import.meta.env.DEV) {
          console.log('[Analytics] PostHog initialized');
        }
      },
    });
  }
}

// Identify user for cohort analysis
export function identifyUser(userId: string, properties?: Record<string, any>) {
  if (import.meta.env.VITE_POSTHOG_API_KEY) {
    posthog.identify(userId, properties);
  }
}

// Reset user identity (on logout)
export function resetUserIdentity() {
  if (import.meta.env.VITE_POSTHOG_API_KEY) {
    posthog.reset();
  }
}

// Track page views
export function trackPageView(pageName: string, properties?: Record<string, any>) {
  if (import.meta.env.VITE_POSTHOG_API_KEY) {
    posthog.capture('$pageview', {
      $current_url: window.location.href,
      page_name: pageName,
      ...properties,
    });
  }
}

// Event tracking functions

// User Authentication Events
export const analytics = {
  // User Registration & Login
  trackUserRegistered(userId: string, plan: string) {
    posthog.capture('user_registered', {
      user_id: userId,
      plan,
      timestamp: new Date().toISOString(),
    });
  },

  trackUserLoggedIn(userId: string, method: 'password' | '2fa') {
    posthog.capture('user_logged_in', {
      user_id: userId,
      method,
      timestamp: new Date().toISOString(),
    });
  },

  trackUserLoggedOut(userId: string) {
    posthog.capture('user_logged_out', {
      user_id: userId,
      timestamp: new Date().toISOString(),
    });
  },

  // Resume Events
  trackResumeCreated(resumeId: string, template: string) {
    posthog.capture('resume_created', {
      resume_id: resumeId,
      template,
      timestamp: new Date().toISOString(),
    });
  },

  trackResumeEdited(resumeId: string, section: string) {
    posthog.capture('resume_edited', {
      resume_id: resumeId,
      section,
      timestamp: new Date().toISOString(),
    });
  },

  trackResumeExported(resumeId: string, format: 'pdf' | 'docx') {
    posthog.capture('resume_exported', {
      resume_id: resumeId,
      format,
      timestamp: new Date().toISOString(),
    });
  },

  trackResumeTailored(resumeId: string, jobId: string) {
    posthog.capture('resume_tailored', {
      resume_id: resumeId,
      job_id: jobId,
      timestamp: new Date().toISOString(),
    });
  },

  // AI Feature Events
  trackAIChatStarted(resumeId?: string) {
    posthog.capture('ai_chat_started', {
      resume_id: resumeId,
      timestamp: new Date().toISOString(),
    });
  },

  trackAIChatMessage(resumeId: string, messageCount: number) {
    posthog.capture('ai_chat_message', {
      resume_id: resumeId,
      message_count: messageCount,
      timestamp: new Date().toISOString(),
    });
  },

  trackAIEditApplied(resumeId: string, editType: string) {
    posthog.capture('ai_edit_applied', {
      resume_id: resumeId,
      edit_type: editType,
      timestamp: new Date().toISOString(),
    });
  },

  trackATSScanCompleted(resumeId: string, score: number) {
    posthog.capture('ats_scan_completed', {
      resume_id: resumeId,
      score,
      timestamp: new Date().toISOString(),
    });
  },

  trackCoverLetterGenerated(jobId?: string) {
    posthog.capture('cover_letter_generated', {
      job_id: jobId,
      timestamp: new Date().toISOString(),
    });
  },

  // Job Scraping Events
  trackJobScrapingStarted(platform: string) {
    posthog.capture('job_scraping_started', {
      platform,
      timestamp: new Date().toISOString(),
    });
  },

  trackJobScrapingCompleted(platform: string, jobCount: number) {
    posthog.capture('job_scraping_completed', {
      platform,
      job_count: jobCount,
      timestamp: new Date().toISOString(),
    });
  },

  trackJobSaved(jobId: string, source: string) {
    posthog.capture('job_saved', {
      job_id: jobId,
      source,
      timestamp: new Date().toISOString(),
    });
  },

  trackJobApplied(jobId: string, source: string) {
    posthog.capture('job_applied', {
      job_id: jobId,
      source,
      timestamp: new Date().toISOString(),
    });
  },

  trackJobApplicationStatusChanged(jobId: string, oldStatus: string, newStatus: string) {
    posthog.capture('job_application_status_changed', {
      job_id: jobId,
      old_status: oldStatus,
      new_status: newStatus,
      timestamp: new Date().toISOString(),
    });
  },

  // Subscription Events
  trackSubscriptionUpgraded(oldPlan: string, newPlan: string) {
    posthog.capture('subscription_upgraded', {
      old_plan: oldPlan,
      new_plan: newPlan,
      timestamp: new Date().toISOString(),
    });
  },

  trackSubscriptionCancelled(plan: string, reason?: string) {
    posthog.capture('subscription_cancelled', {
      plan,
      reason,
      timestamp: new Date().toISOString(),
    });
  },

  trackCheckoutStarted(plan: string) {
    posthog.capture('checkout_started', {
      plan,
      timestamp: new Date().toISOString(),
    });
  },

  trackCheckoutCompleted(plan: string, amount: number) {
    posthog.capture('checkout_completed', {
      plan,
      amount,
      timestamp: new Date().toISOString(),
    });
  },

  // Feature Engagement
  trackFeatureUsed(featureName: string, properties?: Record<string, any>) {
    posthog.capture('feature_used', {
      feature_name: featureName,
      ...properties,
      timestamp: new Date().toISOString(),
    });
  },

  trackButtonClicked(buttonName: string, location: string) {
    posthog.capture('button_clicked', {
      button_name: buttonName,
      location,
      timestamp: new Date().toISOString(),
    });
  },

  // Support Events
  trackSupportQuestionAsked(question: string) {
    posthog.capture('support_question_asked', {
      question_length: question.length,
      timestamp: new Date().toISOString(),
    });
  },

  trackAISupportAnswerAccepted(questionId: string) {
    posthog.capture('ai_support_answer_accepted', {
      question_id: questionId,
      timestamp: new Date().toISOString(),
    });
  },

  trackSupportTicketCreated(questionId: string) {
    posthog.capture('support_ticket_created', {
      question_id: questionId,
      timestamp: new Date().toISOString(),
    });
  },

  // Error Tracking
  trackError(error: Error, context?: Record<string, any>) {
    posthog.capture('error_occurred', {
      error_message: error.message,
      error_stack: error.stack,
      ...context,
      timestamp: new Date().toISOString(),
    });
  },
};

export default analytics;
