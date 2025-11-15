import { useLocation, useNavigate } from "react-router-dom";
import { Home, Wrench, MessageSquare, User, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
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
  const [toolsSheetOpen, setToolsSheetOpen] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);

  if (!user) return null;

  const navItems: NavItem[] = [
    {
      id: "home",
      label: "Studio",
      icon: Home,
      action: () => navigate("/"),
      isActive: (pathname) => pathname === "/"
    },
    {
      id: "inspire",
      label: "Inspire",
      icon: Sparkles,
      action: () => navigate("/inspire"),
      isActive: (pathname) => pathname === "/inspire" || pathname === "/gallery"
    },
    {
      id: "tools",
      label: "Tools",
      icon: Wrench,
      action: () => setToolsSheetOpen(true),
      isActive: () => false
    },
    {
      id: "artie",
      label: "Artie",
      icon: MessageSquare,
      action: () => {
        // Try button click first (for desktop compatibility)
        const artieButton = document.querySelector('[aria-label="Chat with Artie"]') as HTMLButtonElement;
        if (artieButton) {
          artieButton.click();
        } else {
          // Fallback for mobile - dispatch custom event
          window.dispatchEvent(new CustomEvent('openArtieChat'));
        }
      },
      isActive: () => false
    },
    {
      id: "profile",
      label: "Profile",
      icon: User,
      action: () => setProfileSheetOpen(true),
      isActive: () => false
    }
  ];

  return (
    <>
      {/* Bottom Navigation Bar - Mobile Only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-background/95 backdrop-blur-lg border-t border-border/50 pb-safe">
        <div className="grid grid-cols-5 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.isActive(location.pathname);
            
            return (
              <button
                key={item.id}
                onClick={item.action}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-95 min-h-[48px]",
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
                  "text-[10px] font-medium transition-all",
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

      {/* Tools Sheet */}
      <Sheet open={toolsSheetOpen} onOpenChange={setToolsSheetOpen}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Tools</SheetTitle>
          </SheetHeader>
          
          <div className="grid grid-cols-2 gap-3 py-6">
            <button
              onClick={() => {
                openTool('blend');
                setToolsSheetOpen(false);
              }}
              className="flex flex-col items-center gap-3 p-6 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border border-border/50 hover:border-accent/30 active:scale-95 transition-all"
            >
              <div className="p-3 rounded-lg bg-background/80 border border-border/50">
                <Sparkles className="w-6 h-6 text-accent" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">Blend</p>
                <p className="text-xs text-muted-foreground mt-0.5">Merge images</p>
              </div>
            </button>

            <button
              onClick={() => {
                openTool('upscale');
                setToolsSheetOpen(false);
              }}
              className="flex flex-col items-center gap-3 p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-border/50 hover:border-primary/30 active:scale-95 transition-all"
            >
              <div className="p-3 rounded-lg bg-background/80 border border-border/50">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">Upscale</p>
                <p className="text-xs text-muted-foreground mt-0.5">Enhance quality</p>
              </div>
            </button>

            <button
              onClick={() => {
                navigate('/history');
                setToolsSheetOpen(false);
              }}
              className="flex flex-col items-center gap-3 p-6 rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border/50 hover:border-muted active:scale-95 transition-all"
            >
              <div className="p-3 rounded-lg bg-background/80 border border-border/50">
                <Sparkles className="w-6 h-6 text-foreground" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">History</p>
                <p className="text-xs text-muted-foreground mt-0.5">Past generations</p>
              </div>
            </button>
          </div>
        </SheetContent>
      </Sheet>

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
