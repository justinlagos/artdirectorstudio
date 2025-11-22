import { Wand2, Blend, Maximize2, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToolsModal } from "@/contexts/ToolsModalContext";
import { useNavigate } from "react-router-dom";

interface Tool {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  action: () => void;
  gradient: string;
}

export const ToolsShowcase = () => {
  const { openTool, openGenerateDialog } = useToolsModal();
  const navigate = useNavigate();

  const tools: Tool[] = [
    {
      id: "generate",
      icon: Wand2,
      title: "Generate",
      description: "Create stunning images from your optimized prompt",
      action: () => openGenerateDialog({ prompt: "", mode: "generate" }),
      gradient: "from-primary/20 to-primary/5"
    },
    {
      id: "blend",
      icon: Blend,
      title: "Blend",
      description: "Merge multiple images with AI for unique compositions",
      action: () => openTool("blend"),
      gradient: "from-accent/20 to-accent/5"
    },
    {
      id: "upscale",
      icon: Maximize2,
      title: "Upscale",
      description: "Enhance image resolution while preserving quality",
      action: () => openTool("upscale"),
      gradient: "from-secondary/20 to-secondary/5"
    },
    {
      id: "artie",
      icon: MessageSquare,
      title: "Artie AI",
      description: "Get instant help and suggestions from AI assistant",
      action: () => navigate("/artie"),
      gradient: "from-primary/15 to-primary/5"
    }
  ];

  return (
    <div className="w-full py-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Quick Tools</h3>
        <p className="text-sm text-muted-foreground">Explore what you can do next</p>
      </div>

      {/* Desktop: Grid layout */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool) => (
          <Card 
            key={tool.id}
            className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-border/50 hover:border-primary/30 bg-card overflow-hidden"
            onClick={tool.action}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />
            <CardContent className="relative p-5 flex flex-col items-start gap-3">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-background/80 to-background/60 border border-border/50 group-hover:border-primary/30 transition-colors">
                <tool.icon className="w-5 h-5 text-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-base text-foreground mb-1 group-hover:text-primary transition-colors">
                  {tool.title}
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {tool.description}
                </p>
              </div>
              <Button 
                size="sm" 
                variant="ghost" 
                className="w-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Quick Start →
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mobile: Horizontal scrolling with snap */}
      <div className="md:hidden -mx-4 px-4">
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide">
          {tools.map((tool) => (
            <Card 
              key={tool.id}
              className="flex-shrink-0 w-[280px] snap-center hover:shadow-lg transition-all duration-300 cursor-pointer border-border/50 active:scale-95 bg-card overflow-hidden"
              onClick={tool.action}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-50 pointer-events-none`} />
              <CardContent className="relative p-5 flex flex-col items-start gap-3 h-full">
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-background/80 to-background/60 border border-border/50">
                  <tool.icon className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-base text-foreground mb-1">
                    {tool.title}
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {tool.description}
                  </p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full mt-2"
                >
                  Open Tool
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
