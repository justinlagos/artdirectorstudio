import { Skeleton } from "@/components/ui/skeleton";

export const AuthSkeleton = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo/Header */}
        <div className="text-center">
          <Skeleton className="mx-auto h-12 w-12 rounded-full" />
          <Skeleton className="mx-auto mt-4 h-8 w-48" />
          <Skeleton className="mx-auto mt-2 h-4 w-64" />
        </div>

        {/* Form Card */}
        <div className="space-y-6 rounded-2xl border border-border/60 bg-card p-8 shadow-sm">
          {/* Input Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
          </div>

          {/* Submit Button */}
          <Skeleton className="h-11 w-full rounded-lg" />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Skeleton className="h-px w-full" />
            </div>
            <div className="relative flex justify-center">
              <Skeleton className="h-4 w-16" />
            </div>
          </div>

          {/* Social Buttons */}
          <div className="space-y-3">
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        </div>

        {/* Footer Links */}
        <div className="text-center">
          <Skeleton className="mx-auto h-4 w-56" />
        </div>
      </div>
    </div>
  );
};
