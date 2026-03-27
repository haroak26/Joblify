interface StatfolioTracker {
  track: (event: string, metadata?: Record<string, unknown>) => void;
  identify: (traits: {
    userId: string;
    email?: string;
    plan?: string;
    [key: string]: unknown;
  }) => void;
}

declare global {
  interface Window {
    statfolio?: StatfolioTracker;
  }
}

export {};
