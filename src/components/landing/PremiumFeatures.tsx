/**
 * Premium Features Section
 * Clean typography, fade-in animations, minimalist tool icons
 */

import { motion } from "framer-motion";
import { Sparkles, Palette, Layers, Maximize2, Wand2, Zap } from "lucide-react";
import { useInView } from "framer-motion";
import { useRef } from "react";

const features = [
  {
    title: "Artie",
    description: "Your AI creative partner. Brainstorms ideas, refines concepts, and guides your vision.",
    icon: Sparkles,
    color: "text-primary",
  },
  {
    title: "Studio",
    description: "A focused canvas for generating, refining, and perfecting visuals with precision.",
    icon: Palette,
    color: "text-primary",
  },
  {
    title: "Blend",
    description: "Combine ideas, styles, or directions into a single cohesive visual.",
    icon: Layers,
    color: "text-muted-foreground",
  },
  {
    title: "Upscale",
    description: "High-resolution output ready for presentations, pitches, and production.",
    icon: Maximize2,
    color: "text-muted-foreground",
  },
  {
    title: "Edit",
    description: "Refine images with precision. Adjust lighting, color, composition, and more.",
    icon: Wand2,
    color: "text-muted-foreground",
  },
  {
    title: "Generate",
    description: "Transform prompts into stunning visuals with award-winning quality.",
    icon: Zap,
    color: "text-muted-foreground",
  },
];

export const PremiumFeatures = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <section
      ref={ref}
      className="relative py-24 md:py-32 px-6 lg:px-8 bg-background overflow-hidden"
      aria-label="Features"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 md:mb-20 space-y-4"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
            Everything you need
            <br />
            <span className="text-muted-foreground font-normal">in one place</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mt-6">
            A complete creative workflow designed for modern designers and art directors.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                className="group relative gpu-accelerated"
              >
                <div className="relative h-full bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl md:rounded-2xl p-8 md:p-10 transition-all duration-300 hover:shadow-medium hover:border-border hover:-translate-y-1 will-change-transform">
                  {/* Glowing border on hover */}
                  <div className="absolute inset-0 rounded-xl md:rounded-2xl border border-primary/0 group-hover:border-primary/20 transition-colors duration-300 pointer-events-none" />
                  
                  {/* Micro shadow effect */}
                  <div className="absolute inset-0 rounded-xl md:rounded-2xl shadow-subtle opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                  <div className="space-y-5 relative z-10">
                    {/* Icon with subtle glow */}
                    <div className="relative">
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors duration-300">
                        <Icon className={`w-6 h-6 md:w-7 md:h-7 ${feature.color} transition-colors duration-300`} />
                      </div>
                      {/* Subtle glow behind icon */}
                      <div className="absolute inset-0 rounded-xl bg-primary/5 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xl md:text-2xl font-semibold text-foreground leading-tight">
                        {feature.title}
                      </h3>
                      <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

