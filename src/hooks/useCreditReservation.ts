import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { parseEdgeFunctionError } from "@/lib/edgeFunctionErrors";

type ReserveResult =
  | { reserved: true; reservationId: string; commit: () => Promise<{ success: boolean; new_balance?: number }>; refund: () => Promise<{ success: boolean }> }
  | { reserved: false; available: number; required: number };

let lastReserveResponse: { status: number; body: unknown } | null = null;

export function setLastReserveResponse(status: number, body: unknown) {
  lastReserveResponse = { status, body };
}

export function getLastReserveResponse() {
  return lastReserveResponse;
}

export function useCreditReservation() {
  const [isReserving, setIsReserving] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reserve = useCallback(
    async (amount: number, action: string, description?: string): Promise<ReserveResult> => {
      setError(null);
      setIsReserving(true);
      try {
        const { data, error: fnError } = await supabase.functions.invoke("reserve-credits", {
          body: { amount, action, description },
        });

        lastReserveResponse = { status: 200, body: data || fnError };

        if (fnError) {
          const parsed = await parseEdgeFunctionError(fnError);
          const details = parsed.details ?? {};
          const available = typeof details.available === "number" ? details.available : 0;
          const required = typeof details.required === "number" ? details.required : amount;
          const message =
            parsed.message && parsed.message !== "Edge Function returned a non-2xx status code"
              ? parsed.message
              : fnError.message;

          setError(message);
          return { reserved: false, available, required };
        }

        if (data?.reserved && data?.reservation_id) {
          const id = data.reservation_id as string;
          setReservationId(id);

          const commit = async () => {
            const { data: commitData, error: commitErr } = await supabase.functions.invoke("commit-credits", {
              body: { reservation_id: id, action: "commit" },
            });
            setReservationId(null);
            return { success: !commitErr, new_balance: commitData?.new_balance };
          };

          const refund = async () => {
            await supabase.functions.invoke("commit-credits", {
              body: { reservation_id: id, action: "refund" },
            });
            setReservationId(null);
            return { success: true };
          };

          return { reserved: true, reservationId: id, commit, refund };
        }

        if (data?.error) {
          setError(String(data.error));
        }

        return {
          reserved: false,
          available: data?.available ?? 0,
          required: data?.required ?? amount,
        };
      } finally {
        setIsReserving(false);
      }
    },
    []
  );

  return { reserve, isReserving, reservationId, error };
}
