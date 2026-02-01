export type ScrapeStep = "idle" | "defining" | "x" | "reddit" | "complete" | "error";

export interface ScrapeStatus {
  step: ScrapeStep;
  label: string;
  updatedAt: number;
}

const scrapeStatusByUser = new Map<string, ScrapeStatus>();

export function setScrapeStatus(userId: string, status: Omit<ScrapeStatus, "updatedAt">) {
  scrapeStatusByUser.set(userId, { ...status, updatedAt: Date.now() });
}

export function getScrapeStatus(userId: string): ScrapeStatus {
  return (
    scrapeStatusByUser.get(userId) ?? {
      step: "idle",
      label: "Idle",
      updatedAt: Date.now(),
    }
  );
}

export function clearScrapeStatus(userId: string) {
  scrapeStatusByUser.delete(userId);
}
