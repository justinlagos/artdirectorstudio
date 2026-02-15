import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type ReserveResult =
  | { reserved: true; reservationId: string; commit: () => Promise<{ success: boolean; new_balance?: number }>; refund: () => Promise<{ success: boolean }> }
  | { reserved: false; available: number; required: number };

export function useCreditReservation() {
  const { session } = useAuth();
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

        if (fnError) {
          setError(fnError.message);
          return { reserved: false, available: 0, required: amount };
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

        return {
          reserved: false,
          available: data?.available ?? 0,
          required: data?.required ?? amount,
        };
      } finally {
        setIsReserving(false);
      }
    },
    [session]
  );

  return { reserve, isReserving, reservationId, error };
}
