import { AnalysisSkeleton } from "@/components/skeletons/AnalysisSkeleton";

export const LoadingState = () => {
  return (
    <div className="mx-auto max-w-4xl py-12">
      <AnalysisSkeleton />
    </div>
  );
};
