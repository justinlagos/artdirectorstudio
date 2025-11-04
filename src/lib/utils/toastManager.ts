import { toast } from "@/hooks/use-toast";

const activeToasts = new Map<string, number>();
const TOAST_DEBOUNCE_MS = 3000;

/**
 * Shows a toast with debouncing to prevent toast storms.
 * Uses a key to prevent duplicate toasts within TOAST_DEBOUNCE_MS.
 */
export const showToast = (
  key: string,
  options: {
    title?: string;
    description?: string;
    variant?: "default" | "destructive";
  }
) => {
  const now = Date.now();
  const lastToastTime = activeToasts.get(key);

  // If a toast with this key was shown recently, skip
  if (lastToastTime && now - lastToastTime < TOAST_DEBOUNCE_MS) {
    return;
  }

  activeToasts.set(key, now);
  toast(options);

  // Clean up old entries
  setTimeout(() => {
    activeToasts.delete(key);
  }, TOAST_DEBOUNCE_MS);
};

/**
 * Shows a toast for a specific request ID (for operations with request IDs)
 */
export const showRequestToast = (
  requestId: string,
  options: {
    title?: string;
    description?: string;
    variant?: "default" | "destructive";
  }
) => {
  showToast(`request-${requestId}`, options);
};

/**
 * Shows a toast for a specific error type (for general errors)
 */
export const showErrorToast = (
  errorKey: string,
  message: string
) => {
  showToast(`error-${errorKey}`, {
    variant: "destructive",
    title: "Error",
    description: message,
  });
};

/**
 * Shows a toast for a specific success type
 */
export const showSuccessToast = (
  successKey: string,
  message: string
) => {
  showToast(`success-${successKey}`, {
    title: "Success",
    description: message,
  });
};
