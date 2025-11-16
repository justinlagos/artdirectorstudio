import { useLocation, useNavigate } from "react-router-dom";
import { Home, Layers, Maximize2, Sparkles, FolderOpen, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { useState } from "react";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { useToolsModal } from "@/contexts/ToolsModalContext";
import { UserMenu } from "./UserMenu";
import { TrialCreditsDisplay } from "./TrialCreditsDisplay";
import { SubscriptionStatus } from "./SubscriptionStatus";

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  action: () => void;
  isActive: (pathname: string) => boolean;
}

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openTool } = useToolsModal();
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);

  if (!user) return null;

  const navItems: NavItem[] = [
    {
      id: "studio",
      label: "Studio",
      icon: Home,
      action: () => navigate("/"),
      isActive: (pathname) => pathname === "/"
    },
    {
      id: "blend",
      label: "Blend",
      icon: Layers,
      action: () => openTool('blend'),
      isActive: () => false
    },
    {
      id: "upscale",
      label: "Upscale",
      icon: Maximize2,
      action: () => openTool('upscale'),
      isActive: () => false
    },
    {
      id: "inspire",
      label: "Inspire",
      icon: Sparkles,
      action: () => navigate("/inspire"),
      isActive: (pathname) => pathname === "/inspire" || pathname === "/gallery"
    },
    {
      id: "projects",
      label: "My Projects",
      icon: FolderOpen,
      action: () => navigate("/history"),
      isActive: (pathname) => pathname === "/history"
    }
  ];

  return (
    <>
      {/* Bottom Navigation Bar - Mobile Only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-background/95 backdrop-blur-lg border-t border-border/50 pb-safe">
        <div className="grid grid-cols-5 h-16 safe-bottom">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.isActive(location.pathname);
            
            return (
              <button
                key={item.id}
                onClick={item.action}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 min-h-[48px] relative touch-manipulation",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon 
                  className={cn(
                    "w-5 h-5 transition-all",
                    isActive && "scale-110"
                  )} 
                />
                <span className={cn(
                  "text-xs md:text-[10px] font-medium transition-all",
                  isActive && "font-semibold"
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Profile Sheet */}
      <Sheet open={profileSheetOpen} onOpenChange={setProfileSheetOpen}>
        <SheetContent side="bottom" className="h-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Profile</SheetTitle>
          </SheetHeader>
          
          <div className="flex flex-col gap-4 py-6">
            <UserMenu />
            <Separator />
            <TrialCreditsDisplay />
            <SubscriptionStatus />
            <Separator />
            <Button
              variant="outline"
              onClick={() => {
                navigate('/settings');
                setProfileSheetOpen(false);
              }}
              className="w-full"
            >
              Settings
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
