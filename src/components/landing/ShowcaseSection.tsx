import { useInspireFeed } from "@/hooks/useInspireFeed";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { openStudioWithPrompt } from "@/lib/studio";
import { useAuth } from "@/contexts/AuthContext";
import { GuestActionDialog } from "@/components/GuestActionDialog";

export const ShowcaseSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [guestDialogOpen, setGuestDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  // Safely get projects with error handling
  const feedResult = useInspireFeed({
    filter: "featured",
    pageSize: 6,
    realtimeKey: "landing-showcase",
  });
  
  const projects = Array.isArray(feedResult?.projects) ? feedResult.projects : [];
  const error = feedResult?.error || null;

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
      { threshold: 0.1 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const handleProjectClick = (project: any) => {
    if (!user) {
      setSelectedProject(project);
      setGuestDialogOpen(true);
      return;
    }

    openStudioWithPrompt({
      basePrompt: project.asset?.prompt ?? "",
      imageUrl: project.asset?.image_url ?? undefined,
      meta: { source: "showcase" },
    });
  };

  const handleGuestSignIn = () => {
    setGuestDialogOpen(false);
    navigate("/auth");
  };

  const featuredProjects = Array.isArray(projects) ? projects.slice(0, 6) : [];

  return (
    <>
      <section 
        id="showcase-section"
        ref={(node) => {
          containerRef.current = node;
        }}
        className="py-20 md:py-28 px-6 lg:px-8 bg-background"
        aria-label="Made with ArtDirector Studio"
      >
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16 md:mb-20 space-y-4">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
              The level of work you can create.
            </h2>
          </div>

          {/* Showcase Grid */}
          {!error && featuredProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {featuredProjects.map((project, index) => (
                <div
                  key={project.id}
                  className={`group relative bg-card border border-border/50 rounded-xl md:rounded-2xl overflow-hidden hover:shadow-medium transition-all duration-500 cursor-pointer hover:scale-[1.02] ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                  onClick={() => handleProjectClick(project)}
                >
                  <div className="aspect-square relative overflow-hidden bg-muted/30">
                    {project.asset?.image_url ? (
                      <img
                        src={project.asset.image_url}
                        alt={project.asset.prompt || "Generated visual"}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-muted-foreground text-sm">No image</div>
                      </div>
                    )}
                    
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors duration-300" />
                  </div>
                  
                  <div className="p-6 md:p-8">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      <span className="font-medium">Generated from:</span>{" "}
                      {project.asset?.prompt 
                        ? (project.asset.prompt.length > 80 
                            ? `${project.asset.prompt.substring(0, 80)}...` 
                            : project.asset.prompt)
                        : "Creative brief"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">
                {error ? "Unable to load featured work" : "Featured work coming soon"}
              </p>
            </div>
          )}
        </div>
      </section>

      <GuestActionDialog
        open={guestDialogOpen}
        onOpenChange={setGuestDialogOpen}
        onSignIn={handleGuestSignIn}
        title="Sign in to remix this project"
        description="Try ArtDirector Studio free. Sign in to open this project in Studio."
      />
    </>
  );
};

