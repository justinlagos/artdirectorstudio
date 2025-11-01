import { Coins } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { Skeleton } from "./ui/skeleton";

export const CreditBalance = () => {
  const { balance, loading } = useCredits();

  if (loading) {
    return <Skeleton className="h-10 w-24" />;
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
      <Coins className="w-4 h-4 text-primary" />
      <span className="text-sm font-medium">
        {balance ?? 0} credits
      </span>
    </div>
  );
};
