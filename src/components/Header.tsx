import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "./ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { CreditBalance } from "./CreditBalance";
import { useCredits } from "@/hooks/useCredits";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { Menu, Sparkles, Home, BarChart3, Layers, Maximize2, ImageIcon, Coins, Wrench, ChevronDown } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Separator } from "./ui/separator";
import { ToolDialog } from "./ToolDialog";

export const Header = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { balance: credits } = useCredits();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleBuyCredits = () => {
    navigate("/settings");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center space-x-2 group">
            <Sparkles className="h-6 w-6 transition-all duration-200 stroke-foreground group-hover:stroke-transparent group-hover:fill-primary" />
            <span className="hidden xs:inline font-display font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 via-zinc-600 to-zinc-900 dark:from-white dark:via-zinc-300 dark:to-white">ArtDirector Studio</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">Studio</Link>
            </Button>
            
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1">
                    Tools
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 bg-background/95 backdrop-blur-xl z-50">
                  <ToolDialog
                    trigger={
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Layers className="mr-2 h-4 w-4" />
                        <div>
                          <p className="font-medium">Blend</p>
                          <p className="text-xs text-muted-foreground">Combine multiple visuals</p>
                        </div>
                      </DropdownMenuItem>
                    }
                    title="Blend Images"
                    description="Seamlessly combine two images with customizable blend modes"
                    toolType="blend"
                  />
                  <ToolDialog
                    trigger={
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Maximize2 className="mr-2 h-4 w-4" />
                        <div>
                          <p className="font-medium">Upscale</p>
                          <p className="text-xs text-muted-foreground">Enhance resolution</p>
                        </div>
                      </DropdownMenuItem>
                    }
                    title="Upscale Image"
                    description="Enhance image resolution with AI-powered upscaling"
                    toolType="upscale"
                  />
                  <ToolDialog
                    trigger={
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <ImageIcon className="mr-2 h-4 w-4" />
                        <div>
                          <p className="font-medium">Batch</p>
                          <p className="text-xs text-muted-foreground">Process multiple images</p>
                        </div>
                      </DropdownMenuItem>
                    }
                    title="Batch Processing"
                    description="Process multiple images at once with consistent operations"
                    toolType="batch"
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button variant="ghost" size="sm" asChild>
              <Link to="/inspire">Inspire</Link>
            </Button>
            
            {user && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/analytics">Analytics</Link>
              </Button>
            )}
          </nav>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {/* Credits - Compact on mobile */}
              <div className="flex items-center gap-1.5 min-w-[44px] min-h-[44px] justify-center">
                <Coins className="h-4 w-4" />
                <span className="text-sm font-medium">{credits}</span>
              </div>
              
              {/* Buy Credits - Hidden on mobile, in menu instead */}
              <Button
                onClick={handleBuyCredits}
                size="sm"
                className="hidden md:flex"
              >
                Buy Credits
              </Button>
              <ThemeToggle />
              <UserMenu />
            </>
          ) : (
            <>
              <ThemeToggle />
              <Button onClick={() => navigate("/auth")} size="sm">
                Sign In
              </Button>
            </>
          )}

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="min-w-[44px] min-h-[44px]">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[320px] sm:w-[340px]">
              <SheetHeader>
                <SheetTitle className="text-left">Menu</SheetTitle>
              </SheetHeader>
              
              <div className="flex flex-col h-full py-6">
                {/* Main Navigation */}
                <nav className="flex flex-col space-y-2">
                  <Button 
                    variant="ghost" 
                    asChild 
                    className="justify-start min-h-[56px] text-base"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link to="/">
                      <Home className="mr-3 h-5 w-5" />
                      Studio
                    </Link>
                  </Button>
                  
                  {/* Tools Accordion - Only for authenticated users */}
                  {user && (
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="tools" className="border-none">
                        <AccordionTrigger className="py-4 px-4 hover:no-underline hover:bg-muted/50 rounded-md">
                          <div className="flex items-center gap-3">
                            <Wrench className="h-5 w-5" />
                            <span className="text-base font-normal">Tools</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-2">
                          <div className="flex flex-col space-y-1 pl-4">
                            <ToolDialog
                              trigger={
                                <Button 
                                  variant="ghost" 
                                  className="justify-start min-h-[48px] w-full"
                                >
                                  <Layers className="mr-3 h-4 w-4" />
                                  Blend
                                </Button>
                              }
                              title="Blend Images"
                              description="Seamlessly combine two images"
                              toolType="blend"
                            />
                            <ToolDialog
                              trigger={
                                <Button 
                                  variant="ghost" 
                                  className="justify-start min-h-[48px] w-full"
                                >
                                  <Maximize2 className="mr-3 h-4 w-4" />
                                  Upscale
                                </Button>
                              }
                              title="Upscale Image"
                              description="Enhance image resolution"
                              toolType="upscale"
                            />
                            <ToolDialog
                              trigger={
                                <Button 
                                  variant="ghost" 
                                  className="justify-start min-h-[48px] w-full"
                                >
                                  <ImageIcon className="mr-3 h-4 w-4" />
                                  Batch
                                </Button>
                              }
                              title="Batch Processing"
                              description="Process multiple images at once"
                              toolType="batch"
                            />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}

                  <Button 
                    variant="ghost" 
                    asChild 
                    className="justify-start min-h-[56px] text-base"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link to="/inspire">
                      <Sparkles className="mr-3 h-5 w-5" />
                      Inspire
                    </Link>
                  </Button>
                  
                  {user && (
                    <Button 
                      variant="ghost" 
                      asChild 
                      className="justify-start min-h-[56px] text-base"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Link to="/analytics">
                        <BarChart3 className="mr-3 h-5 w-5" />
                        Analytics
                      </Link>
                    </Button>
                  )}
                </nav>
                
                {user && (
                  <>
                    <Separator className="my-6" />
                    
                    {/* User Actions */}
                    <div className="space-y-3">
                      <Button 
                        onClick={() => {
                          handleBuyCredits();
                          setMobileMenuOpen(false);
                        }}
                        size="lg"
                        className="w-full min-h-[48px]"
                      >
                        Buy Credits
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
