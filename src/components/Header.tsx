import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToolsModal } from "@/contexts/ToolsModalContext";
import { Button } from "./ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { SubscriptionStatus } from "./SubscriptionStatus";
import { TrialCreditsDisplay } from "./TrialCreditsDisplay";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { Menu, Sparkles, Home, Layers, Maximize2, Wrench, ChevronDown, Palette, FolderOpen } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";

export const Header = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openTool } = useToolsModal();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-4 md:gap-6">
          <Link to="/" className="flex items-center space-x-2 group">
            <Sparkles className="h-6 w-6 transition-all duration-200 stroke-foreground group-hover:stroke-transparent group-hover:fill-primary" />
            <span className="hidden sm:inline font-display font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 via-zinc-600 to-zinc-900 dark:from-white dark:via-zinc-300 dark:to-white">ArtDirector Studio</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">Studio</Link>
            </Button>
            
            {user && (
              <>
                <Button variant="ghost" size="sm" onClick={() => openTool('blend')}>
                  <Layers className="mr-2 h-4 w-4" />
                  Blend
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openTool('upscale')}>
                  <Maximize2 className="mr-2 h-4 w-4" />
                  Upscale
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/history">My Projects</Link>
                </Button>
              </>
            )}

            <Button variant="ghost" size="sm" asChild>
              <Link to="/inspire">Inspire</Link>
            </Button>
          </nav>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1.5 md:gap-2">
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-2">
                <SubscriptionStatus />
              </div>
              <ThemeToggle />
              <div className="hidden sm:block">
                <UserMenu />
              </div>
            </>
          ) : (
            <>
              <ThemeToggle />
              <Button onClick={() => navigate("/auth")} size="sm" className="hidden xs:flex">
                Sign In
              </Button>
            </>
          )}

          {/* Mobile Menu - Hidden when user is logged in (BottomNav takes over) */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className={user ? "hidden" : "sm:hidden"}>
              <Button variant="ghost" size="icon" className="min-w-[44px] min-h-[44px] touch-manipulation">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <SheetHeader>
                <SheetTitle className="text-left">Menu</SheetTitle>
              </SheetHeader>
              
              <div className="flex flex-col h-full py-6 space-y-6">
                {/* User Info Section */}
                {user && (
                  <div className="flex flex-col gap-3 pb-4 border-b border-border">
                    <UserMenu />
                    <TrialCreditsDisplay />
                    <SubscriptionStatus />
                  </div>
                )}
                
                {/* Main Navigation */}
                <nav className="flex flex-col space-y-1">
                  <Button 
                    variant="ghost" 
                    asChild 
                    className="justify-start min-h-[48px]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link to="/">
                      <Home className="mr-3 h-4 w-4" />
                      Studio
                    </Link>
                  </Button>
                  
                  {user && (
                    <>
                      <Button 
                        variant="ghost" 
                        className="justify-start min-h-[48px] w-full"
                        onClick={() => {
                          openTool('blend');
                          setMobileMenuOpen(false);
                        }}
                      >
                        <Layers className="mr-3 h-4 w-4" />
                        Blend
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="justify-start min-h-[48px] w-full"
                        onClick={() => {
                          openTool('upscale');
                          setMobileMenuOpen(false);
                        }}
                      >
                        <Maximize2 className="mr-3 h-4 w-4" />
                        Upscale
                      </Button>
                      <Button 
                        variant="ghost" 
                        asChild 
                        className="justify-start min-h-[48px]"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Link to="/history">
                          <FolderOpen className="mr-3 h-4 w-4" />
                          My Projects
                        </Link>
                      </Button>
                    </>
                  )}

                  <Button 
                    variant="ghost" 
                    asChild 
                    className="justify-start min-h-[48px]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link to="/inspire">
                      <Sparkles className="mr-3 h-4 w-4" />
                      Inspire
                    </Link>
                  </Button>
                  
                  {!user && (
                    <Button 
                      onClick={() => {
                        navigate("/auth");
                        setMobileMenuOpen(false);
                      }}
                      className="w-full min-h-[48px] mt-4"
                    >
                      Sign In
                    </Button>
                  )}
                </nav>
                
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
