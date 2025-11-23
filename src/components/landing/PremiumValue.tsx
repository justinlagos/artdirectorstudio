/**
 * Premium Value Section
 * Dual-core messaging with clean typography and minimal animation
 */

import { motion } from "framer-motion";
import { Sparkles, Palette, ArrowRight } from "lucide-react";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const PremiumValue = () => {
  const navigate = useNavigate();
  const ref = useRef(null);
  // Optimized for performance - only trigger once when in view
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        duration: 0.3,
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
      className="relative py-24 md:py-32 px-6 lg:px-8 bg-surface-1 overflow-hidden"
      aria-label="Value proposition"
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="space-y-16 md:space-y-20"
        >
          {/* Dual-core messaging */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            {/* Artie */}
            <motion.div
              variants={itemVariants}
              className="group relative gpu-accelerated"
            >
              <div className="relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl md:rounded-3xl p-8 md:p-12 shadow-subtle hover:shadow-medium transition-all duration-300 hover:-translate-y-1 will-change-transform">
                {/* Glowing border */}
                <div className="absolute inset-0 rounded-2xl md:rounded-3xl border border-primary/0 group-hover:border-primary/20 transition-colors duration-300 pointer-events-none" />
                
                <div className="space-y-6 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-subtle">
                        <Sparkles className="w-8 h-8 text-primary" />
                      </div>
                      <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl -z-10" />
                    </div>
                    <h3 className="text-3xl md:text-4xl font-bold text-foreground">
                      Artie
                    </h3>
                  </div>

                  <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                    Your AI creative partner. Brainstorms ideas, refines concepts, analyzes images, and guides your vision from brief to final deliverable.
                  </p>

                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span>Creative brief analysis</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span>Visual concept brainstorming</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span>Proactive workflow assistance</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>

            {/* Studio */}
            <motion.div
              variants={itemVariants}
              className="group relative gpu-accelerated"
            >
              <div className="relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl md:rounded-3xl p-8 md:p-12 shadow-subtle hover:shadow-medium transition-all duration-300 hover:-translate-y-1 will-change-transform">
                {/* Glowing border */}
                <div className="absolute inset-0 rounded-2xl md:rounded-3xl border border-primary/0 group-hover:border-primary/20 transition-colors duration-300 pointer-events-none" />
                
                <div className="space-y-6 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-subtle">
                        <Palette className="w-8 h-8 text-primary" />
                      </div>
                      <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl -z-10" />
                    </div>
                    <h3 className="text-3xl md:text-4xl font-bold text-foreground">
                      Studio
                    </h3>
                  </div>

                  <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                    Your creative workspace. Generate, edit, blend, and upscale images with professional-grade tools and precision controls.
                  </p>

                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span>AI-powered image generation</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span>Advanced editing tools</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span>Professional output quality</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>

          {/* CTA */}
          <motion.div
            variants={itemVariants}
            className="text-center"
          >
            <div className="inline-flex flex-col items-center gap-6">
              <p className="text-lg md:text-xl text-muted-foreground">
                Ready to transform your creative workflow?
              </p>
              <Button
                size="lg"
                className="group text-base md:text-lg px-8 md:px-10 py-6 md:py-7 h-auto font-medium rounded-xl shadow-subtle hover:shadow-medium transition-all duration-300"
                onClick={() => navigate("/auth")}
              >
                <div className="absolute inset-0 rounded-xl border border-primary/20 group-hover:border-primary/40 transition-colors duration-300" />
                <span className="relative z-10 flex items-center">
                  Get started
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                </span>
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

