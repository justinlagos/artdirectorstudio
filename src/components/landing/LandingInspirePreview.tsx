/**
 * Landing Inspire Preview Section
 * Shows a preview of real Inspire content on the landing page
 */

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { useInspireFeed } from "@/hooks/useInspireFeed";
import { InspireCardSkeleton } from "@/components/skeletons/InspireCardSkeleton";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { motion } from "framer-motion";
import { useRef } from "react";
import { useInView } from "framer-motion";

export const LandingInspirePreview = () => {
  const navigate = useNavigate();
  const { projects, isInitialLoading } = useInspireFeed({
    filter: "featured",
    pageSize: 6,
  });

  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
      },
    },
  };

  return (
    <section
      ref={ref}
      className="relative py-24 md:py-32 px-6 lg:px-8 bg-surface-1"
      aria-label="Inspire showcase"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-16 space-y-4"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary uppercase tracking-wider">
              Community Gallery
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.1]">
            Real work from the community
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            See what designers and creative directors are building with ArtDirector Studio.
          </p>
        </motion.div>

        {/* Projects Grid */}
        {isInitialLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <InspireCardSkeleton key={i} />
            ))}
          </div>
        ) : projects.length > 0 ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {projects.slice(0, 6).map((project) => (
              <motion.div
                key={project.id}
                variants={itemVariants}
                className="group relative overflow-hidden rounded-xl border border-border/50 bg-card hover:shadow-medium transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                onClick={() => navigate(`/shared/${project.share_token}`)}
              >
                <div className="aspect-square relative overflow-hidden bg-muted">
                  <OptimizedImage
                    src={project.asset?.image_url || ''}
                    alt={project.asset?.prompt || "Community artwork"}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                
                {/* Metadata */}
                <div className="p-4 space-y-2">
                  <p className="text-sm text-foreground font-medium line-clamp-2">
                    {project.asset?.prompt || "Untitled artwork"}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {project.tags && typeof project.tags === 'object' && 'style' in project.tags && project.tags.style && (
                      <span className="px-2 py-1 rounded-md bg-muted/50">
                        {Array.isArray(project.tags.style) ? project.tags.style[0] : project.tags.style}
                      </span>
                    )}
                    <span>{project.like_count || 0} likes</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No featured work available yet.</p>
          </div>
        )}

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12"
        >
          <Button
            size="lg"
            variant="outline"
            className="text-base px-8 py-6 h-auto rounded-lg border-2"
            onClick={() => navigate("/inspire")}
          >
            Explore Inspire
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};
