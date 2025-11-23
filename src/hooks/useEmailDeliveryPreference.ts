import { useEffect, useState } from "react";

const EMAIL_DELIVERY_PREF_KEY = "ads-email-delivery-enabled";

export function useEmailDeliveryPreference() {
  const [emailDeliveryEnabled, setEmailDeliveryEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(EMAIL_DELIVERY_PREF_KEY);
    if (stored === null) return true;
    try {
      return JSON.parse(stored) as boolean;
    } catch {
      return stored === "true";
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(EMAIL_DELIVERY_PREF_KEY, JSON.stringify(emailDeliveryEnabled));
  }, [emailDeliveryEnabled]);

  return { emailDeliveryEnabled, setEmailDeliveryEnabled };
}
