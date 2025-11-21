import { useNavigate, useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const ArtieTab = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isArtiePage = location.pathname === "/artie";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={isArtiePage ? "default" : "outline"}
          size="icon"
          onClick={() => navigate("/artie")}
          className={cn(
            "fixed right-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 rounded-full shadow-lg transition-all duration-300",
            "bg-gradient-to-br from-primary to-primary/80 hover:scale-110 hover:shadow-xl",
            isArtiePage && "ring-2 ring-primary ring-offset-2 ring-offset-background"
          )}
          aria-label="Open Artie"
        >
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left" className="mr-2">
        <p className="font-medium">Chat with Artie</p>
        <p className="text-xs text-muted-foreground">Creative Intelligence System</p>
      </TooltipContent>
    </Tooltip>
  );
};

