import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ImageEmailAction = "generate" | "edit" | "blend" | "upscale";

interface SendImageEmailPayload {
  imageUrl: string;
  prompt: string;
  action: ImageEmailAction;
  viewUrl?: string;
  downloadUrl?: string;
}

export const sendImageEmail = async (payload: SendImageEmailPayload) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("No active session. Please sign in again to send email.");
  }

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-image-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success) {
    const message = data?.error || "Failed to send email";
    throw new Error(message);
  }

  return data;
};

export const showEmailSentToast = (email?: string) => {
  const inboxUrl = "https://mail.google.com";
  toast.success("Email sent!", {
    description: email ? `Check ${email} for your creation.` : "Your image has been delivered to your inbox.",
    action: {
      label: "Open inbox",
      onClick: () => window.open(inboxUrl, "_blank"),
    },
    duration: 5000,
  });
};
