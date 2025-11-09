import { memo, useMemo } from "react";
import { InspireProject } from "@/types/inspire";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wand2, Share2 } from "lucide-react";

interface InspireCardProps {
  project: InspireProject;
  onSelect?: (project: InspireProject) => void;
  onUseInStudio?: (project: InspireProject) => void;
  onShare?: (project: InspireProject) => void;
  layout?: "masonry" | "featured";
  showAuthor?: boolean;
}

const InspireCardComponent = ({
  project,
  onSelect,
  onUseInStudio,
  onShare,
  layout = "masonry",
  showAuthor = true,
}: InspireCardProps) => {
  const altText = useMemo(() => {
    if (project.asset?.prompt) {
      return project.asset.prompt;
    }
    const author = project.profile?.username || project.profile?.email?.split("@")[0] || "creator";
    return `Inspire project by ${author}`;
  }, [project]);

  const authorName = useMemo(() => {
    if (!showAuthor) return null;
    if (project.profile?.username) {
      return project.profile.username;
    }
    return project.profile?.email?.split("@")[0] ?? null;
  }, [project, showAuthor]);

  const handleSelect = () => {
    onSelect?.(project);
  };

  return (
    <article
      onClick={handleSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleSelect();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={altText}
      className={cn(
        "group relative isolate overflow-hidden rounded-3xl border border-border/50 bg-background/60 shadow-sm transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        layout === "masonry" ? "mb-6 break-inside-avoid" : "flex-shrink-0",
        "hover:-translate-y-1 hover:shadow-xl"
      )}
    >
      <div className="relative">
        {project.asset?.image_url && (
          <img
            src={project.asset.image_url}
            alt={altText}
            loading="lazy"
            decoding="async"
            className="h-auto w-full object-cover"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/10 to-background/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="absolute top-3 right-3 flex flex-col items-end gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          {project.featured && <Badge className="bg-primary/90 text-primary-foreground shadow">Featured</Badge>}
          {project.staff_pick && <Badge variant="secondary" className="bg-muted/80">Staff Pick</Badge>}
        </div>

        <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            {authorName && (
              <span className="rounded-full bg-background/70 px-3 py-1 text-xs font-medium text-foreground/90 backdrop-blur">
                {authorName}
              </span>
            )}
            <div className="flex items-center gap-2">
              {onUseInStudio && (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  onClick={(event) => {
                    event.stopPropagation();
                    onUseInStudio(project);
                  }}
                  className="h-9 w-9 rounded-full bg-background/80 text-foreground shadow backdrop-blur transition hover:scale-[1.05]"
                  aria-label="Use in Studio"
                >
                  <Wand2 className="h-4 w-4" />
                </Button>
              )}
              {onShare && (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  onClick={(event) => {
                    event.stopPropagation();
                    onShare(project);
                  }}
                  className="h-9 w-9 rounded-full bg-background/80 text-foreground shadow backdrop-blur transition hover:scale-[1.05]"
                  aria-label="Share project"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export const InspireCard = memo(InspireCardComponent);
