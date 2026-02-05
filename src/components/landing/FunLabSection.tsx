import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  gradient: string;
  route: string;
  badge?: string;
}

const TOOLS: Tool[] = [
  {
    id: 'caricature',
    name: 'Caricature Studio',
    description: 'Transform portraits into stylized caricatures with 4 artistic presets',
    icon: '🎨',
    gradient: 'from-pink-500/20 to-purple-500/20',
    route: '/tools/caricature',
    badge: 'New',
  },
  {
    id: 'blend',
    name: 'Image Blender',
    description: 'Merge two images into stunning visual combinations',
    icon: '🎭',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    route: '/tools/blend',
  },
  {
    id: 'upscale',
    name: 'AI Upscale',
    description: 'Enhance resolution and add rich details to your images',
    icon: '📐',
    gradient: 'from-green-500/20 to-emerald-500/20',
    route: '/tools/upscale',
  },
  {
    id: 'edit',
    name: 'Smart Edit',
    description: 'AI-powered image editing with natural language instructions',
    icon: '✨',
    gradient: 'from-orange-500/20 to-amber-500/20',
    route: '/tools/edit',
  },
  {
    id: 'remove-bg',
    name: 'Background Remover',
    description: 'Instantly remove backgrounds with precision AI cutting',
    icon: '🎯',
    gradient: 'from-violet-500/20 to-purple-500/20',
    route: '/tools/remove-background',
  },
  {
    id: 'analyze',
    name: 'Visual Analyzer',
    description: 'Deep AI analysis of composition, style, and art direction',
    icon: '🔍',
    gradient: 'from-red-500/20 to-rose-500/20',
    route: '/studio',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export function FunLabSection() {
  const navigate = useNavigate();

  return (
    <section className="relative py-24 md:py-32 px-6 lg:px-8 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-surface-1 to-background pointer-events-none" />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4 mb-16"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-2 border border-border/50 shadow-subtle">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Fun Lab</span>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
            Creative Tools for Every Vision
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Powerful AI tools designed for art directors, designers, and creators.
            <br className="hidden md:block" />
            Transform, enhance, and experiment with your visual ideas.
          </p>
        </motion.div>

        {/* Tools Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {TOOLS.map((tool) => (
            <motion.div key={tool.id} variants={itemVariants}>
              <Card
                className={cn(
                  "group relative p-6 h-full cursor-pointer transition-all duration-300",
                  "hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1",
                  "bg-gradient-to-br",
                  tool.gradient
                )}
                onClick={() => navigate(tool.route)}
              >
                {/* Badge */}
                {tool.badge && (
                  <div className="absolute top-4 right-4 px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    {tool.badge}
                  </div>
                )}

                {/* Icon */}
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  {tool.icon}
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                {/* Arrow hint */}
                <div className="mt-4 flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Try it now</span>
                  <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="text-center mt-16"
        >
          <Button
            size="lg"
            onClick={() => navigate('/register')}
            className="gap-2 shadow-lg hover:shadow-xl transition-shadow"
          >
            <Sparkles className="h-5 w-5" />
            Start Creating for Free
            <ArrowRight className="h-5 w-5" />
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            50 free credits • No credit card required
          </p>
        </motion.div>
      </div>
    </section>
  );
}
