import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { InspireProject } from "@/types/inspire";
import { supabase } from "@/integrations/supabase/client";
import { InspireCard } from "@/components/inspire/InspireCard";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SELECT_COLUMNS = `
  id,
  share_token,
  view_count,
  like_count,
  bookmark_count,
  created_at,
  is_deleted,
  featured,
  staff_pick,
  tags,
  user_id,
  asset:generated_assets (
    id,
    type,
    image_url,
    prompt,
    created_at
  ),
  profile:profiles!shared_assets_user_id_fkey (
    id,
    email,
    username
  )
`;

const sortFeatured = (projects: InspireProject[]) => {
  return [...projects].sort((a, b) => {
    const aDate = new Date(a.created_at).getTime();
    const bDate = new Date(b.created_at).getTime();
    return bDate - aDate;
  });
};

export const LandingFeaturedInspire = () => {
  const [featuredProjects, setFeaturedProjects] = useState<InspireProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLElement | null>(null);
  const navigate = useNavigate();

  const fetchFeatured = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("shared_assets")
        .select(SELECT_COLUMNS)
        .eq("is_deleted", false)
        .eq("featured", true)
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) throw error;

      const cleaned = (data || []).filter((item): item is InspireProject => !!item.asset);
      setFeaturedProjects(sortFeatured(cleaned));
    } catch (error) {
      console.error("Error loading featured inspire projects", error);
      toast.error("Unable to load Inspire highlights right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeatured();
  }, [fetchFeatured]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    const node = containerRef.current;
    if (node) {
      observer.observe(node);
    }

    return () => {
      if (node) {
        observer.unobserve(node);
      }
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("landing-featured-inspire")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shared_assets" },
        async (payload) => {
          const newRow = payload.new as InspireProject | null;
          const oldRow = payload.old as InspireProject | null;

          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            if (newRow && !newRow.is_deleted && newRow.featured) {
              const { data } = await supabase
                .from("shared_assets")
                .select(SELECT_COLUMNS)
                .eq("id", newRow.id)
                .eq("is_deleted", false)
                .maybeSingle();

              if (data && (data as InspireProject).asset) {
                setFeaturedProjects((prev) => {
                  const filtered = prev.filter((item) => item.id !== newRow.id);
                  return sortFeatured([...filtered, data as InspireProject]);
                });
              }
              return;
            }
          }

          if (
            payload.eventType === "DELETE" ||
            (payload.eventType === "UPDATE" && oldRow?.featured && !newRow?.featured)
          ) {
            const removedId = payload.eventType === "DELETE" ? payload.old.id : oldRow?.id;
            if (removedId) {
              setFeaturedProjects((prev) => prev.filter((item) => item.id !== removedId));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSelect = (project: InspireProject) => {
    navigate(`/inspire?project=${project.id}`);
  };

  const cardClasses = useMemo(
    () =>
      cn(
        "transition-all duration-700", 
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      ),
    [isVisible]
  );

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
          <h2 className="mt-2 text-3xl font-semibold text-foreground">See what creators are making in ArtDirector Studio</h2>
        </div>
        <Button asChild variant="ghost" className="gap-2 self-start md:self-center">
          <Link to="/inspire">
            Explore Inspire
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {loading && (
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-64 animate-pulse rounded-3xl bg-muted/50" />
          ))}
        </div>
      )}

      {!loading && featuredProjects.length > 0 && (
        <div className="mt-8 space-y-6">
          <div className="grid grid-cols-1 gap-6 md:hidden">
            {featuredProjects.slice(0, 3).map((project) => (
              <div key={project.id} className={cardClasses}>
                <InspireCard
                  project={project}
                  onSelect={handleSelect}
                  onUseInStudio={() => navigate(`/inspire?project=${project.id}&action=studio`)}
                  onShare={() => navigate(`/inspire?project=${project.id}`)}
                  layout="featured"
                />
              </div>
            ))}
          </div>

          <div className="hidden md:flex gap-6 overflow-x-auto pb-2">
            {featuredProjects.map((project) => (
              <div key={project.id} className={cardClasses}>
                <InspireCard
                  project={project}
                  onSelect={handleSelect}
                  onUseInStudio={() => navigate(`/inspire?project=${project.id}&action=studio`)}
                  onShare={() => navigate(`/inspire?project=${project.id}`)}
                  layout="featured"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
