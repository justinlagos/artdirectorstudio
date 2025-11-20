import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { InspireGrid } from "@/components/InspireGrid";
import { GuestActionDialog } from "@/components/GuestActionDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useInspireFeed } from "@/hooks/useInspireFeed";
import type { InspireProject } from "@/types/inspire";
import { openStudioWithPrompt } from "@/lib/studio";
import {
  ArrowUpRight,
  Calendar,
  Check,
  Copy,
  Eye,
  Share2,
  Sparkles,
  Star,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { InspireProactiveSuggestions } from "@/components/InspireProactiveSuggestions";

const ITEMS_PER_PAGE = 24;

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const buildShareUrl = (project: InspireProject) => {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/share/${project.share_token}`;
};

interface ProjectDetailsProps {
  project: InspireProject;
  onCopyPrompt: () => void;
  copiedPrompt: boolean;
  onUseInStudio: () => void;
  onShare: () => void;
}

const ProjectDetails = ({ project, onCopyPrompt, copiedPrompt, onUseInStudio, onShare }: ProjectDetailsProps) => {
  return (
    <div className="space-y-6 text-sm text-muted-foreground">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/70">Prompt</p>
        <p className="mt-3 rounded-2xl bg-muted/40 p-4 text-base text-foreground shadow-inner">
          {project.asset?.prompt ?? "No prompt provided"}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onCopyPrompt} className="gap-2">
            {copiedPrompt ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copiedPrompt ? "Copied" : "Copy prompt"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onShare} className="gap-2">
            <Share2 className="h-4 w-4" /> Share
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <Button className="w-full gap-2" onClick={onUseInStudio}>
          <Wand2 className="h-4 w-4" /> Use in Studio
        </Button>
        <Button
          variant="secondary"
          className="w-full gap-2"
          onClick={() => {
            const url = buildShareUrl(project);
            if (url) {
              window.open(url, "_blank", "noopener,noreferrer");
            }
          }}
        >
          <ArrowUpRight className="h-4 w-4" /> View public link
        </Button>
      </div>
    </div>
  );
};

const Inspire = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    projects,
    isInitialLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
  } = useInspireFeed({ pageSize: ITEMS_PER_PAGE });

  const [selectedProject, setSelectedProject] = useState<InspireProject | null>(null);
  const [guestDialogOpen, setGuestDialogOpen] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const pendingProjectId = useRef<string | null>(null);
  const queuedStudioAction = useRef(false);

  const heroImage = useMemo(() => projects[0]?.asset?.image_url ?? null, [projects]);

  const handleUseInStudio = useCallback(
    (project: InspireProject, options?: { fromQuery?: boolean }) => {
      if (!project) return;

      if (!user) {
        setGuestDialogOpen(true);
        if (!options?.fromQuery) {
          const params = new URLSearchParams(location.search);
          params.set("project", project.id);
          params.set("action", "studio");
          navigate({ pathname: location.pathname, search: params.toString() }, { replace: false });
        }
        return;
      }

      const currentParams = new URLSearchParams(location.search);
      const nextParams = new URLSearchParams(currentParams.toString());
      if (nextParams.has("project")) {
        nextParams.delete("project");
      }
      if (nextParams.has("action")) {
        nextParams.delete("action");
      }
      if (location.search !== "" && nextParams.toString() !== currentParams.toString()) {
        navigate({ pathname: location.pathname, search: nextParams.toString() }, { replace: true });
      }

      openStudioWithPrompt({
        basePrompt: project.asset?.prompt ?? "",
        imageUrl: project.asset?.image_url ?? undefined,
        meta: { source: "inspire" },
      });
    },
    [location.pathname, location.search, navigate, user]
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const projectParam = params.get("project");
    const actionParam = params.get("action");

    if (projectParam) {
      pendingProjectId.current = projectParam;
    }

    if (actionParam === "studio") {
      queuedStudioAction.current = true;
    }
  }, [location.search]);

  useEffect(() => {
    if (!pendingProjectId.current) return;

    const project = projects.find(
      (item) => item.id === pendingProjectId.current || item.share_token === pendingProjectId.current
    );

    if (project) {
      setSelectedProject(project);
      pendingProjectId.current = null;
    }
  }, [projects]);

  useEffect(() => {
    if (!queuedStudioAction.current || !selectedProject) return;
    queuedStudioAction.current = false;
    handleUseInStudio(selectedProject, { fromQuery: true });
  }, [handleUseInStudio, selectedProject]);

  useEffect(() => {
    if (!selectedProject) return;
    const updated = projects.find((item) => item.id === selectedProject.id);
    if (updated && updated !== selectedProject) {
      setSelectedProject(updated);
    }
  }, [projects, selectedProject]);

  useEffect(() => {
    const node = loaderRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore().catch((err) => {
            console.error("Failed to load more Inspire projects", err);
          });
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [hasMore, loadMore, projects.length]);

  const handleOpenProject = (project: InspireProject) => {
    setSelectedProject(project);
    const params = new URLSearchParams(location.search);
    params.set("project", project.id);
    params.delete("action");
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: false });
  };

  const handleCloseProject = () => {
    setSelectedProject(null);
    const params = new URLSearchParams(location.search);
    params.delete("project");
    params.delete("action");
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  };

  const handleShare = async (project: InspireProject) => {
    const shareUrl = buildShareUrl(project);
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard");
    } catch (err) {
      console.error("Share copy failed", err);
      toast.error("Unable to copy link");
    }
  };

  const handleGuestSignIn = () => {
    setGuestDialogOpen(false);
    navigate("/auth");
  };

  const handleCopyPrompt = async (project: InspireProject) => {
    if (!project.asset?.prompt) return;
    try {
      await navigator.clipboard.writeText(project.asset.prompt);
      setCopiedPrompt(true);
      toast.success("Prompt copied to clipboard");
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch (err) {
      console.error("Prompt copy failed", err);
      toast.error("Unable to copy prompt");
    }
  };

  return (
    <ErrorBoundary onReset={() => refresh()}>
      <TooltipProvider delayDuration={150}>
        <div className="min-h-screen bg-surface-1 text-foreground">
          <Helmet>
            <title>Inspire - Discover Real-Time AI Creations | ArtDirector Studio</title>
            <meta
              name="description"
              content="Explore a live, ever-evolving gallery of AI art from the ArtDirector Studio community. Discover featured work, staff picks, and creative inspiration updated in real time."
            />
            {heroImage && <meta property="og:image" content={heroImage} />}
            <meta property="og:title" content="Inspire - ArtDirector Studio" />
            <meta
              property="og:description"
              content="Discover featured AI projects from the ArtDirector community."
            />
          </Helmet>

        <Header />

        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-6 pb-24 pt-16">
          <section className="relative overflow-hidden rounded-4xl border border-border/60 bg-background/70 p-10 shadow-[0_55px_120px_-80px_rgba(0,0,0,0.75)]">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent" />
            <div className="relative z-10 grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:items-center">
              <div className="space-y-6">
                <Badge variant="secondary" className="rounded-full px-4 py-1 text-xs uppercase tracking-[0.35em]">
                  Inspire Gallery
                </Badge>
                <h1 className="text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
                  A living gallery of ArtDirector Studio creators
                </h1>
                <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
                  Immerse yourself in a calm, image-led space curated in real time. Every project here has been approved by the ArtDirector Studio team or celebrated as a featured highlight.
                </p>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Real-time updates
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    Staff picks &amp; featured drops
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-sky-500" />
                    Viewable without signing in
                  </div>
                </div>
              </div>
              {heroImage && (
                <div className="hidden overflow-hidden rounded-3xl border border-border/60 shadow-xl md:block">
                  <img
                    src={heroImage}
                    alt="Latest featured Inspire project"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
            </div>
          </section>

          <section className="space-y-8">
            {projects.length >= 3 && (
              <InspireProactiveSuggestions viewedProjects={projects.slice(0, 10)} />
            )}
            
            <InspireGrid
              ref={loaderRef}
              projects={projects}
              isLoading={isInitialLoading}
              isLoadingMore={isLoadingMore}
              hasMore={hasMore}
              onSelect={handleOpenProject}
              onUseInStudio={handleUseInStudio}
              error={error}
              onRetry={refresh}
            />
          </section>
        </main>

        <Footer />

        {selectedProject && (
          isMobile ? (
            <Drawer open={!!selectedProject} onOpenChange={(open) => !open && handleCloseProject()}>
              <DrawerContent className="max-h-[92dvh] rounded-t-4xl">
                <DrawerHeader className="flex flex-col gap-1 text-left">
                  <DrawerTitle className="text-lg font-semibold">
                    {selectedProject.profile?.username ||
                      selectedProject.profile?.email?.split("@")[0] ||
                      "Creator"}
                  </DrawerTitle>
                  <p className="text-sm text-muted-foreground">{formatDate(selectedProject.created_at)}</p>
                </DrawerHeader>
                <div className="space-y-6 overflow-y-auto px-6 pb-10">
                  {selectedProject.asset?.image_url && (
                    <img
                      src={selectedProject.asset.image_url}
                      alt={selectedProject.asset.prompt ?? "Inspire project"}
                      className="w-full rounded-3xl"
                    />
                  )}
                  <ProjectDetails
                    project={selectedProject}
                    onCopyPrompt={() => handleCopyPrompt(selectedProject)}
                    copiedPrompt={copiedPrompt}
                    onUseInStudio={() => handleUseInStudio(selectedProject)}
                    onShare={() => handleShare(selectedProject)}
                  />
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <Dialog open={!!selectedProject} onOpenChange={(open) => !open && handleCloseProject()}>
              <DialogContent className="max-w-5xl overflow-hidden rounded-4xl p-0">
                <div className="grid max-h-[80vh] grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
                  <div className="relative bg-muted">
                    {selectedProject.asset?.image_url && (
                      <img
                        src={selectedProject.asset.image_url}
                        alt={selectedProject.asset.prompt ?? "Inspire project"}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-6 overflow-y-auto border-l border-border/60 p-8">
                    <DialogHeader className="space-y-3 text-left">
                      <DialogTitle className="text-xl font-semibold">
                        {selectedProject.profile?.username ||
                          selectedProject.profile?.email?.split("@")[0] ||
                          "Creator"}
                      </DialogTitle>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" /> {formatDate(selectedProject.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" /> {selectedProject.view_count.toLocaleString()} views
                        </span>
                        {selectedProject.featured && (
                          <Badge className="bg-primary/90 text-primary-foreground">Featured</Badge>
                        )}
                        {selectedProject.staff_pick && <Badge variant="secondary">Staff Pick</Badge>}
                      </div>
                    </DialogHeader>
                    <ProjectDetails
                      project={selectedProject}
                      onCopyPrompt={() => handleCopyPrompt(selectedProject)}
                      copiedPrompt={copiedPrompt}
                      onUseInStudio={() => handleUseInStudio(selectedProject)}
                      onShare={() => handleShare(selectedProject)}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )
        )}

        <GuestActionDialog
          open={guestDialogOpen}
          onOpenChange={setGuestDialogOpen}
          onSignIn={handleGuestSignIn}
          title="Sign in to Remix this project"
          description="Try ArtDirector Studio free. Sign in to open this project in Studio."
        />
        </div>
      </TooltipProvider>
    </ErrorBoundary>
  );
};

export default Inspire;

