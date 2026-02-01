import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse API error messages and return a user-friendly error message.
 * Handles structured error responses from the server.
 * 
 * @param error - The error object from a failed API request
 * @param defaultMessage - The default message to return if parsing fails
 * @returns A user-friendly error message
 */
export function parseApiError(error: Error, defaultMessage = "An error occurred. Please try again."): string {
  try {
    // Error format from apiRequest is "{status}: {json}" - extract JSON portion
    const colonIndex = error.message.indexOf(': ');
    const jsonStr = colonIndex >= 0 ? error.message.slice(colonIndex + 2) : error.message;
    const parsed = JSON.parse(jsonStr);
    
    // Handle specific error codes
    if (parsed.code === "EMAIL_NOT_VERIFIED") {
      return "Please verify your email address to access this feature.";
    }
    if (parsed.code === "SCRAPE_LIMIT") {
      return parsed.message || "You've reached your job search limit for this month.";
    }
    if (parsed.code === "SKILLS_LIMIT") {
      return parsed.message || "You've reached your skills limit.";
    }
    if (parsed.code === "PLAN_REQUIRED") {
      return parsed.error || "This feature requires a paid plan.";
    }
    if (parsed.code === "SCHEDULE_LIMIT") {
      return parsed.message || "You've reached your schedule limit.";
    }
    
    // Return the error message or error field from the response
    return parsed.message || parsed.error || defaultMessage;
  } catch {
    // Return default message if parsing fails
    return defaultMessage;
  }
}
