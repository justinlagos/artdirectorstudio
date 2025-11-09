import { ReactNode } from "react";
import { Drawer as DrawerRoot, DrawerPortal, DrawerOverlay, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/lib/utils";

interface ToolDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  stickyFooterOnMobile?: boolean;
}

export const ToolDrawer = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  contentClassName,
  headerClassName,
  stickyFooterOnMobile = false,
}: ToolDrawerProps) => {
  return (
    <DrawerRoot open={open} onOpenChange={onOpenChange}>
      <DrawerPortal>
        <DrawerOverlay className="backdrop-blur-sm" />
        <DrawerPrimitive.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[96dvh] flex-col rounded-t-[24px] border border-border/80 bg-background shadow-xl",
            "sm:mx-auto sm:w-full sm:max-w-4xl",
            className,
          )}
        >
          <div className="mx-auto mt-3 h-1.5 w-16 rounded-full bg-muted" />
          <div className="flex min-h-0 flex-1 flex-col">
            <header
              className={cn(
                "sticky top-0 z-20 border-b border-border/80 bg-background/95 px-6 pb-4 pt-5 text-left backdrop-blur supports-[backdrop-filter]:bg-background/70",
                headerClassName,
              )}
            >
              <DrawerTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
                {title}
              </DrawerTitle>
              {description && (
                <DrawerDescription className="text-left text-sm text-muted-foreground">
                  {description}
                </DrawerDescription>
              )}
            </header>

            <div
              className={cn(
                "flex-1 overflow-y-auto px-6 py-5",
                "[&::-webkit-scrollbar]:w-2",
                "supports-[padding:env(safe-area-inset-bottom)]:pb-[calc(1.25rem+env(safe-area-inset-bottom))]",
                stickyFooterOnMobile && "pb-28 md:pb-5",
                contentClassName,
              )}
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {children}
            </div>

            {footer && (
              <footer className={cn(
                "z-20 border-t border-border/80 bg-background/95 px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/70",
                stickyFooterOnMobile 
                  ? "md:sticky md:bottom-0 fixed bottom-0 left-0 right-0 shadow-lg" 
                  : "sticky bottom-0"
              )}>
                {footer}
              </footer>
            )}
          </div>
        </DrawerPrimitive.Content>
      </DrawerPortal>
    </DrawerRoot>
  );
};
