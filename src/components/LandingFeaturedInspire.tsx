import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { InspireProject } from "@/types/inspire";
import { InspireCard } from "@/components/InspireCard";
import { Button } from "@/components/ui/button";
import { useInspireFeed } from "@/hooks/useInspireFeed";
import { cn } from "@/lib/utils";
import { getOptimizedImageUrl } from "@/lib/imageOptimization";

interface LandingFeaturedInspireProps {
  onUseInStudio?: (project: InspireProject) => void;
}

export const LandingFeaturedInspire = ({ onUseInStudio }: LandingFeaturedInspireProps) => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLElement | null>(null);

  const { projects, isInitialLoading, error, refresh } = useInspireFeed({
    filter: "featured",
    pageSize: 8,
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

  const featuredProjects = useMemo(() => projects.slice(0, 8), [projects]);

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
      className="relative mt-24 rounded-4xl border border-border/50 bg-gradient-to-br from-surface-1/80 to-surface-2/60 p-8 md:p-12 shadow-[0_45px_120px_-80px_rgba(0,0,0,0.65)]"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground/80 mb-2">Featured from Inspire</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            See what creators are making
          </h2>
          <p className="text-muted-foreground mt-2">
            Explore stunning works from the ArtDirector Studio community
          </p>
        </div>
        <Button asChild variant="default" size="lg" className="gap-2 self-start md:self-center shadow-lg">
          <Link to="/inspire">Explore All →</Link>
        </Button>
      </div>

      {isInitialLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="aspect-[4/3] animate-pulse rounded-2xl bg-muted/50" />
          ))}
        </div>
      )}

      {!isInitialLoading && error && (
        <div className="flex flex-col items-center gap-3 text-center py-12">
          <p className="text-sm text-muted-foreground">Unable to load Inspire highlights right now.</p>
          <Button variant="secondary" size="sm" onClick={refresh}>
            Reload
          </Button>
        </div>
      )}

      {!isInitialLoading && !error && featuredProjects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
          {featuredProjects.map((project, index) => (
            <div 
              key={project.id} 
              className={cn(
                cardClasses,
                "group relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-lg hover:shadow-2xl transition-all duration-300"
              )}
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={getOptimizedImageUrl(project.asset?.image_url, { width: 1024, quality: 85, format: 'webp' })}
                  alt={project.asset?.prompt || "Featured artwork"}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                
                {/* Author info - bottom left */}
                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-xs font-semibold text-primary-foreground">
                    {project.profile?.email?.charAt(0).toUpperCase() || 'A'}
                  </div>
                  <span className="text-sm font-medium text-white drop-shadow-lg">
                    {project.profile?.email?.split('@')[0] || 'Creator'}
                  </span>
                </div>
                
                {/* Generate button - bottom right */}
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUseInStudio?.(project);
                  }}
                  className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  Generate Like This
                </Button>
              </div>
              
              {/* Prompt text */}
              {project.asset?.prompt && (
                <div className="p-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {project.asset.prompt}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

