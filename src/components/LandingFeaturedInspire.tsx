import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { InspireProject } from "@/types/inspire";
import { InspireCard } from "@/components/InspireCard";
import { Button } from "@/components/ui/button";
import { useInspireFeed } from "@/hooks/useInspireFeed";
import { cn } from "@/lib/utils";

interface LandingFeaturedInspireProps {
  onUseInStudio?: (project: InspireProject) => void;
}

export const LandingFeaturedInspire = ({ onUseInStudio }: LandingFeaturedInspireProps) => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLElement | null>(null);

  const { projects, isInitialLoading, error, refresh } = useInspireFeed({
    filter: "featured",
    pageSize: 6,
    realtimeKey: "landing-featured-inspire",
  });

  useEffect(() => {
    const node = containerRef.current;
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

  const featuredProjects = useMemo(() => projects.slice(0, 6), [projects]);

  const cardClasses = useMemo(
    () =>
      cn(
        "transition-all duration-700",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      ),
    [isVisible]
  );

  const handleSelect = (project: InspireProject) => {
    navigate(`/inspire?project=${project.id}`);
  };

  return (
    <section
      ref={(node) => {
        containerRef.current = node;
      }}
      className="relative mt-24 rounded-4xl border border-border/50 bg-surface-1/60 p-8 shadow-[0_45px_120px_-80px_rgba(0,0,0,0.65)]"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground/80">Featured from Inspire</p>
          <h2 className="mt-2 text-3xl font-semibold text-foreground">
            See what creators are making in ArtDirector Studio
          </h2>
        </div>
        <Button asChild variant="ghost" className="gap-2 self-start md:self-center">
          <Link to="/inspire">Explore Inspire →</Link>
        </Button>
      </div>

      {isInitialLoading && (
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-64 animate-pulse rounded-3xl bg-muted/50" />
          ))}
        </div>
      )}

      {!isInitialLoading && error && (
        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">Unable to load Inspire highlights right now.</p>
          <Button variant="secondary" size="sm" onClick={refresh}>
            Reload
          </Button>
        </div>
      )}

      {!isInitialLoading && !error && featuredProjects.length > 0 && (
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {featuredProjects.map((project) => (
            <div key={project.id} className={cardClasses}>
              <InspireCard
                project={project}
                onSelect={handleSelect}
                onUseInStudio={onUseInStudio}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

