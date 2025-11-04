import { supabase } from "@/integrations/supabase/client";

/**
 * Reserve credits before an operation (deducts immediately, marks as pending)
 */
export async function reserveCredits(
  amount: number,
  action: string,
  provider: string,
  requestId: string
) {
  const { data, error } = await supabase.functions.invoke('reserve-credits', {
    body: { amount, action, provider, request_id: requestId }
  });

  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || 'Failed to reserve credits');
  
  return data;
}

/**
 * Commit credits after successful operation (marks pending transaction as completed)
 */
export async function commitCredits(requestId: string) {
  const { data, error } = await supabase.functions.invoke('commit-credits', {
    body: { request_id: requestId }
  });

  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || 'Failed to commit credits');
  
  return data;
}

/**
 * Refund credits if operation fails (adds credits back, creates refund record)
 */
export async function refundCredits(requestId: string, reason: string) {
  const { data, error } = await supabase.functions.invoke('refund-credits', {
    body: { request_id: requestId, reason }
  });

  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || 'Failed to refund credits');
  
  return data;
}
