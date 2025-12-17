/**
 * Premium Hero Section
 * Minimal, elegant hero with scroll-based motion and parallax
 * Dual-core messaging: Artie + Studio
 */

import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Palette } from "lucide-react";
import { useRef } from "react";

interface PremiumHeroProps {
  user: any;
}

export const PremiumHero = ({ user }: PremiumHeroProps) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLElement>(null);
  
  // Scroll-based motion
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  // Parallax transforms - subtle and smooth
  const y1 = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  
  // Spring animations for smooth 60fps motion - optimized for performance
  const smoothY1 = useSpring(y1, { stiffness: 100, damping: 30, mass: 0.5 });
  const smoothY2 = useSpring(y2, { stiffness: 100, damping: 30, mass: 0.5 });
  const smoothOpacity = useSpring(opacity, { stiffness: 100, damping: 30, mass: 0.5 });

  // Fade-in animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
        duration: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
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
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center px-6 lg:px-8 pt-20 pb-16 md:pb-24 overflow-hidden"
      aria-label="Hero section"
    >
      {/* Background gradient with subtle parallax - GPU accelerated */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-background via-surface-1 to-background pointer-events-none gpu-accelerated"
        style={{ y: smoothY1 }}
      />

      {/* Subtle grid pattern - GPU accelerated */}
      <motion.div
        className="absolute inset-0 opacity-[0.02] pointer-events-none gpu-accelerated"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
          y: smoothY2,
        }}
      />

      <div className="max-w-7xl mx-auto w-full relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center space-y-8 md:space-y-12"
        >
          {/* Dual-core messaging: Artie + Studio */}
          <motion.div variants={itemVariants} className="space-y-6 md:space-y-8">
            {/* Badge */}
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-2 border border-border/50 shadow-subtle"
            >
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <div className="absolute inset-0 blur-sm bg-primary/20 rounded-full" />
                </div>
                <span className="text-sm font-medium text-foreground">Artie</span>
              </div>
              <span className="text-muted-foreground">+</span>
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Studio</span>
              </div>
            </motion.div>

            {/* Main headline */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight leading-[1.05] text-foreground max-w-5xl mx-auto">
              Your creative partner,
              <br />
              <span className="text-muted-foreground font-normal">inside your workspace</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-normal">
              Artie guides your vision. Studio brings it to life.
              <br className="hidden md:block" />
              <span className="block mt-2 md:mt-0 md:inline">Cut ideation time in half.</span>
            </p>
          </motion.div>

          {/* CTAs */}
          {!user && (
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6"
            >
              <Button
                size="lg"
                className="group relative text-base md:text-lg px-8 md:px-10 py-6 md:py-7 h-auto font-medium rounded-xl shadow-subtle hover:shadow-medium transition-all duration-300 overflow-hidden"
                onClick={() => navigate("/auth")}
              >
                {/* Glowing border effect */}
                <div className="absolute inset-0 rounded-xl border border-primary/20 group-hover:border-primary/40 transition-colors duration-300" />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <span className="relative z-10 flex items-center">
                  Start with Artie
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                </span>
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="text-base md:text-lg px-8 md:px-10 py-6 md:py-7 h-auto font-medium rounded-xl border-2 hover:bg-accent transition-all duration-300 hover:shadow-subtle"
                onClick={() => {
                  const studioSection = document.getElementById("studio-section");
                  studioSection?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                Open Studio
              </Button>

              <Button
                variant="ghost"
                size="lg"
                className="text-base md:text-lg px-8 md:px-10 py-6 md:py-7 h-auto font-medium rounded-xl hover:bg-accent/50 transition-all duration-300"
                onClick={() => navigate("/community")}
              >
                Explore Community
              </Button>
            </motion.div>
          )}

          {/* Hero Visual - Minimal Studio Preview */}
          <motion.div
            variants={itemVariants}
            className="mt-16 md:mt-20 lg:mt-24"
          >
            <div className="relative max-w-6xl mx-auto">
              {/* Main container with glowing border */}
              <div className="relative bg-card/50 backdrop-blur-xl rounded-2xl md:rounded-3xl border border-border/50 shadow-glow overflow-hidden">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
                
                {/* Content */}
                <div className="relative aspect-video flex items-center justify-center p-8 md:p-16">
                  <div className="text-center space-y-6">
                    {/* Dual icons - Artie + Studio */}
                    <div className="flex items-center justify-center gap-8">
                      {/* Artie icon */}
                      <motion.div
                        className="relative"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                      >
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-subtle">
                          <Sparkles className="w-10 h-10 md:w-12 md:h-12 text-primary" />
                        </div>
                        <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl -z-10" />
                      </motion.div>

                      {/* Plus sign */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7, duration: 0.4 }}
                        className="text-2xl md:text-3xl text-muted-foreground font-light"
                      >
                        +
                      </motion.div>

                      {/* Studio icon */}
                      <motion.div
                        className="relative"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.6, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                      >
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-subtle">
                          <Palette className="w-10 h-10 md:w-12 md:h-12 text-primary" />
                        </div>
                        <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl -z-10" />
                      </motion.div>
                    </div>

                    <p className="text-sm md:text-base text-muted-foreground font-medium">
                      Seamless creative workflow
                    </p>
                  </div>
                </div>
              </div>

              {/* Floating UI accents */}
              {/* Floating UI accents - GPU accelerated for 60fps */}
              <motion.div
                className="absolute -top-4 -right-4 md:-top-6 md:-right-6 w-12 h-12 md:w-16 md:h-16 bg-card/80 backdrop-blur-xl rounded-xl border border-border/50 shadow-medium flex items-center justify-center gpu-accelerated"
                initial={{ y: 0 }}
                animate={{ y: [-4, 4, -4] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="w-2 h-2 rounded-full bg-primary" />
              </motion.div>

              <motion.div
                className="absolute -bottom-4 -left-4 md:-bottom-6 md:-left-6 w-12 h-12 md:w-16 md:h-16 bg-card/80 backdrop-blur-xl rounded-xl border border-border/50 shadow-medium flex items-center justify-center gpu-accelerated"
                initial={{ y: 0 }}
                animate={{ y: [4, -4, 4] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              >
                <div className="w-2 h-2 rounded-full bg-primary" />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

