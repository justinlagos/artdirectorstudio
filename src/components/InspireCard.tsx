import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { InspireProject } from "@/types/inspire";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";
import { openStudioWithPrompt } from "@/lib/studio";

interface InspireCardProps {
  project: InspireProject;
  onSelect?: (project: InspireProject) => void;
  onUseInStudio?: (project: InspireProject) => void;
  className?: string;
  showAuthor?: boolean;
}

const buildSrcSet = (url: string) => {
  const join = (width: number) => `${url}${url.includes("?") ? "&" : "?"}width=${width} ${width}w`;
  return [480, 720, 1080].map(join).join(", ");
};

const InspireCardComponent = ({
  project,
  onSelect,
  onUseInStudio,
  className,
  showAuthor = true,
}: InspireCardProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const altText = useMemo(() => {
    if (project.asset?.prompt) {
      return project.asset.prompt;
    }

    const author =
      project.profile?.username || project.profile?.email?.split("@")[0] || "creator";
    return `Inspire project by ${author}`;
  }, [project]);

  const authorLabel = useMemo(() => {
    if (!showAuthor) return null;
    if (project.profile?.username) return project.profile.username;
    return project.profile?.email?.split("@")[0] ?? null;
  }, [project, showAuthor]);

  const handleSelect = () => {
    onSelect?.(project);
  };

  return (
    <article
      ref={cardRef}
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleSelect();
        }
      }}
      aria-label={altText}
      className={cn(
        "group relative mb-6 break-inside-avoid overflow-hidden rounded-3xl border border-border/50 bg-background/70 shadow-sm transition duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isVisible ? "opacity-100" : "translate-y-3 opacity-0",
        className
      )}
    >
      <div className="relative">
        {project.asset?.image_url && (
          <img
            src={project.asset.image_url}
            srcSet={buildSrcSet(project.asset.image_url)}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            alt={altText}
            loading="lazy"
            decoding="async"
            className="h-auto w-full object-cover"
          />
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/95 via-background/10 to-background/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="pointer-events-none absolute left-4 right-4 top-4 flex flex-wrap justify-end gap-2">
          {project.featured && (
            <Badge className="rounded-full bg-primary/90 px-3 py-1 text-xs text-primary-foreground shadow">
              Featured
            </Badge>
          )}
          {project.staff_pick && (
            <Badge variant="secondary" className="rounded-full bg-muted/80 px-3 py-1 text-xs">
              Staff Pick
            </Badge>
          )}
        </div>

        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          {authorLabel && (
            <span className="rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-foreground/90 backdrop-blur">
              {authorLabel}
            </span>
          )}

          {onUseInStudio && (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-10 w-10 rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur transition hover:scale-105"
              onClick={(event) => {
                event.stopPropagation();
                openStudioWithPrompt({
                  basePrompt: project.asset?.prompt ?? "",
                  imageUrl: project.asset?.image_url ?? undefined,
                });
              }}
              aria-label="Use in Studio"
            >
              <Wand2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </article>
  );
};

export const InspireCard = memo(InspireCardComponent);

