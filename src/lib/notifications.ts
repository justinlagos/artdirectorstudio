/**
 * Centralized notification system for consistent toast messages
 * Single source of truth for all user-facing notifications
 */

import { toast } from "sonner";

export const notify = {
  // Success notifications
  success: (title: string, description?: string) => {
    toast.success(title, { description });
  },

  // Error notifications
  error: (title: string, description?: string) => {
    toast.error(title, { description });
  },

  // Info notifications
  info: (title: string, description?: string) => {
    toast.info(title, { description });
  },

  // Warning notifications
  warning: (title: string, description?: string) => {
    toast.warning(title, { description });
  },

  // Loading notifications (returns dismiss function)
  loading: (title: string, id?: string) => {
    toast.loading(title, { id });
  },

  // Dismiss a specific notification
  dismiss: (id?: string) => {
    if (id) {
      toast.dismiss(id);
    } else {
      toast.dismiss();
    }
  },

  // Promise-based notification (auto-updates on resolve/reject)
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ) => {
    return toast.promise(promise, messages);
  },

  // Specialized notifications for common actions
  imageGenerated: (url?: string) => {
    toast.success("Image generated!", {
      description: "Your image is ready",
      action: url ? {
        label: "View",
        onClick: () => window.open(url, '_blank')
      } : undefined
    });
  },

  imageEdited: () => {
    toast.success("Image edited!", {
      description: "Changes applied successfully"
    });
  },

  imageUploaded: () => {
    toast.success("Image uploaded!", {
      description: "Ready to process"
    });
  },

  imageSaved: (location: string = "My Projects") => {
    toast.success("Image saved!", {
      description: `Saved to ${location}`
    });
  },

  insufficientCredits: (onBuyCredits?: () => void) => {
    toast.error("Insufficient credits", {
      description: "Please purchase more credits to continue",
      action: onBuyCredits ? {
        label: "Buy Credits",
        onClick: onBuyCredits
      } : undefined
    });
  },

  sessionExpired: () => {
    toast.error("Session expired", {
      description: "Please sign in again"
    });
  },

  networkError: () => {
    toast.error("Connection error", {
      description: "Please check your internet connection"
    });
  },

  promptTooLong: (maxLength: number) => {
    toast.error("Prompt too long", {
      description: `Maximum ${maxLength} characters allowed`
    });
  },

  copied: (what: string = "Text") => {
    toast.success(`${what} copied!`, {
      description: "Ready to paste"
    });
  },

  downloaded: () => {
    toast.success("Downloaded!", {
      description: "Check your downloads folder"
    });
  },
};
