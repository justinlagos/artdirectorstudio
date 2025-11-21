import { memo, Suspense, lazy, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const LazyArtieChat = lazy(() =>
  import("./ArtieChat").then((mod) => ({ default: mod.ArtieChat }))
);

let hasMountedArtieChat = false;

export const SafeArtieChat = memo(() => {
  const [shouldRender] = useState(() => {
    if (hasMountedArtieChat) {
      if (import.meta.env.DEV) {
        console.warn("[SafeArtieChat] Attempted to mount multiple instances. Ignoring.");
      }
      return false;
    }
    hasMountedArtieChat = true;
    return true;
  });

  useEffect(() => {
    return () => {
      hasMountedArtieChat = false;
    };
  }, []);

  if (!shouldRender) {
    return null;
  }

  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="artie-float flex items-center gap-2 rounded-full border border-border bg-background/95 px-4 py-2 text-sm shadow-subtle">
            <Sparkles className="h-4 w-4 text-primary" />
            Starting Artie…
          </div>
        }
      >
        <LazyArtieChat />
      </Suspense>
    </ErrorBoundary>
  );
});

SafeArtieChat.displayName = "SafeArtieChat";

export default SafeArtieChat;
