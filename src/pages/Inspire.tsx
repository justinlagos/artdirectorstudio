import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { InspireCard } from "@/components/inspire/InspireCard";
import { GuestActionDialog } from "@/components/inspire/GuestActionDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { InspireProject } from "@/types/inspire";
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

const ITEMS_PER_PAGE = 24;

const SELECT_COLUMNS = `
  id,
  share_token,
  view_count,
  like_count,
  bookmark_count,
  created_at,
  featured,
  staff_pick,
  is_inspire_approved,
  is_deleted,
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

const sortProjects = (projects: InspireProject[]) => {
  return [...projects].sort((a, b) => {
    if ((a.featured ?? false) !== (b.featured ?? false)) {
      return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    }
    if ((a.staff_pick ?? false) !== (b.staff_pick ?? false)) {
      return (b.staff_pick ? 1 : 0) - (a.staff_pick ? 1 : 0);
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
};

const qualifiesForGallery = (project: InspireProject) => {
  return !project.is_deleted && (project.is_inspire_approved || project.featured || project.staff_pick);
};

const buildShareUrl = (project: InspireProject) => {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/share/${project.share_token}`;
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const Inspire = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();

  const [projects, setProjects] = useState<InspireProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedProject, setSelectedProject] = useState<InspireProject | null>(null);
  const [guestDialogOpen, setGuestDialogOpen] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);
  const [queuedStudioAction, setQueuedStudioAction] = useState(false);
  const observerRef = useRef<HTMLDivElement | null>(null);

  const sortedProjects = useMemo(() => sortProjects(projects), [projects]);

  const fetchProjects = useCallback(
    async (pageNumber: number = 1, append = false) => {
      try {
        if (!append) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const from = (pageNumber - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        const { data, error, count } = await supabase
          .from("shared_assets")
          .select(SELECT_COLUMNS, { count: "exact" })
          .eq("is_deleted", false)
          .or("is_inspire_approved.eq.true,featured.eq.true,staff_pick.eq.true")
          .order("created_at", { ascending: false })
          .range(from, to);

        if (error) throw error;

        const validProjects = (data || []).filter((item): item is InspireProject => !!item.asset && qualifiesForGallery(item));

        setProjects((prev) => {
          const combined = append ? [...prev, ...validProjects] : validProjects;
          const deduped = new Map<string, InspireProject>();
          combined.forEach((item) => {
            deduped.set(item.id, item);
          });
          return Array.from(deduped.values());
        });

        setHasMore(count ? to + 1 < count : validProjects.length === ITEMS_PER_PAGE);
      } catch (error) {
        console.error("Failed to load Inspire projects", error);
        toast.error("Unable to load Inspire gallery right now.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  const fetchProjectById = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from("shared_assets")
      .select(SELECT_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching project", error);
      return null;
    }

    if (data && data.asset && qualifiesForGallery(data as InspireProject)) {
      return data as InspireProject;
    }
    return null;
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchProjects(nextPage, true);
        }
      },
      { threshold: 0.1 }
    );

    const node = observerRef.current;
    if (node) {
      observer.observe(node);
    }

    return () => {
      if (node) {
        observer.unobserve(node);
      }
    };
  }, [fetchProjects, hasMore, loadingMore, page]);

  useEffect(() => {
    const channel = supabase
      .channel("inspire-gallery")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shared_assets" },
        async (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const projectId = payload.new.id as string;
            const project = await fetchProjectById(projectId);

            if (project) {
              setProjects((prev) => {
                const filtered = prev.filter((item) => item.id !== project.id);
                return [...filtered, project];
              });
            } else {
              setProjects((prev) => prev.filter((item) => item.id !== projectId));
            }
          }

          if (payload.eventType === "DELETE") {
            const deletedId = payload.old.id as string;
            setProjects((prev) => prev.filter((item) => item.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProjectById]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const projectParam = params.get("project");
    const actionParam = params.get("action");

    if (projectParam) {
      setPendingProjectId(projectParam);
    }

    if (actionParam === "studio") {
      setQueuedStudioAction(true);
    }
  }, [location.search]);

  useEffect(() => {
    if (!pendingProjectId || sortedProjects.length === 0) return;

    const project = sortedProjects.find(
      (item) => item.id === pendingProjectId || item.share_token === pendingProjectId
    );

    if (project) {
      setSelectedProject(project);
      setPendingProjectId(null);
    }
  }, [pendingProjectId, sortedProjects]);

  useEffect(() => {
    if (queuedStudioAction && selectedProject) {
      handleUseInStudio(selectedProject, { fromQuery: true });
      setQueuedStudioAction(false);
    }
  }, [queuedStudioAction, selectedProject]);

  useEffect(() => {
    if (!selectedProject) return;
    const updated = sortedProjects.find((item) => item.id === selectedProject.id);
    if (updated && updated !== selectedProject) {
      setSelectedProject(updated);
    }
  }, [sortedProjects, selectedProject]);

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
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard");
    } catch (error) {
      console.error("Share copy failed", error);
      toast.error("Unable to copy link");
    }
  };

  const handleUseInStudio = (project: InspireProject, options?: { fromQuery?: boolean }) => {
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

    const params = new URLSearchParams(location.search);
    params.delete("action");
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });

    navigate("/", {
      state: {
        studioPrefill: {
          prompt: project.asset?.prompt ?? "",
          imageUrl: project.asset?.image_url ?? undefined,
        },
      },
    });
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
    } catch (error) {
      console.error("Prompt copy failed", error);
      toast.error("Unable to copy prompt");
    }
  };

  const heroImage = sortedProjects[0]?.asset?.image_url;

  return (
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
          <meta property="og:description" content="Discover featured AI projects from the ArtDirector community." />
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
                <div className="hidden md:block overflow-hidden rounded-3xl border border-border/60 shadow-xl">
                  <img src={heroImage} alt="Latest featured Inspire project" className="h-full w-full object-cover" loading="lazy" />
                </div>
              )}
            </div>
          </section>

          <section>
            {loading && projects.length === 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 9 }).map((_, index) => (
                  <Skeleton key={index} className="h-80 w-full rounded-3xl" />
                ))}
              </div>
            ) : (
              <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 xl:columns-4">
                {sortedProjects.map((project) => (
                  <InspireCard
                    key={project.id}
                    project={project}
                    onSelect={handleOpenProject}
                    onUseInStudio={(item) => handleUseInStudio(item)}
                    onShare={handleShare}
                  />
                ))}
              </div>
            )}
            {(hasMore || loadingMore) && (
              <div ref={observerRef} className="mt-12 flex justify-center">
                <Button variant="ghost" disabled className="px-6 text-muted-foreground">
                  {loadingMore ? "Loading more" : "Scroll to load more"}
                </Button>
              </div>
            )}
          </section>
        </main>

        <Footer />

        {selectedProject && (
          isMobile ? (
            <Drawer open={!!selectedProject} onOpenChange={(open) => !open && handleCloseProject()}>
              <DrawerContent className="max-h-[92dvh] rounded-t-4xl">
                <DrawerHeader className="flex flex-col gap-1 text-left">
                  <DrawerTitle className="text-lg font-semibold">
                    {selectedProject.profile.username || selectedProject.profile.email.split("@")[0]}
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
                        {selectedProject.profile.username || selectedProject.profile.email.split("@")[0]}
                      </DialogTitle>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(selectedProject.created_at)}</span>
                        <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {selectedProject.view_count.toLocaleString()} views</span>
                        {selectedProject.featured && <Badge className="bg-primary/90 text-primary-foreground">Featured</Badge>}
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
          title="Sign in to remix this project"
          description="Access the Studio to remix prompts, tweak settings, and generate your own variations."
        />
      </div>
    </TooltipProvider>
  );
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

      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/70">Tags</p>
        <div className="flex flex-wrap gap-2">
          {project.tags &&
            Object.entries(project.tags).flatMap(([group, values]) =>
              (values || []).map((value) => (
                <Badge key={`${group}-${value}`} variant="outline" className="rounded-full border-border/60">
                  {value}
                </Badge>
              ))
            )}
          {!project.tags && <span className="text-muted-foreground">No tags provided</span>}
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

export default Inspire;
