import { ReactNode } from "react";
import { Drawer as DrawerRoot, DrawerPortal, DrawerOverlay, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useScrollLock } from "@/hooks/useScrollLock";

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
  preventBodyScroll?: boolean;
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
  preventBodyScroll = true,
}: ToolDrawerProps) => {
  const isMobile = useIsMobile();

  // Lock body scroll while any tool modal is open
  useScrollLock(open, "tool-drawer", preventBodyScroll);

  return (
    <DrawerRoot open={open} onOpenChange={onOpenChange} direction="bottom" modal={true} dismissible={true}>
      <DrawerPortal>
        <DrawerOverlay
          className={cn(
            "fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "duration-200 ease-out"
          )}
        />
        <DrawerPrimitive.Content
          className={cn(
            "fixed z-[81] flex flex-col border border-border bg-background shadow-2xl overflow-hidden",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "duration-200 ease-out",
            "left-1/2 -translate-x-1/2",
            "w-[94vw] max-w-[1040px]",
            "rounded-3xl",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
            "md:top-1/2 md:-translate-y-1/2 md:max-h-[90vh]",
            "max-h-[92vh] bottom-4 md:bottom-auto",
            className,
          )}
          style={{
            left: "50%",
            right: "auto",
            ...(isMobile
              ? {
                  bottom: "env(safe-area-inset-bottom)",
                  transform: "translate(-50%, 0)",
                }
              : {
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                }),
          }}
          onPointerDownOutside={(e) => {
            // Prevent closing when clicking on interactive elements inside
            const target = e.target as HTMLElement;
            if (target.closest('button') || target.closest('[role="button"]') || target.closest('input') || target.closest('textarea') || target.closest('select') || target.closest('[data-radix-collection-item]')) {
              e.preventDefault();
            }
          }}
          onInteractOutside={(e) => {
            // Prevent closing when clicking on interactive elements inside
            const target = e.target as HTMLElement;
            if (target.closest('button') || target.closest('[role="button"]') || target.closest('input') || target.closest('textarea') || target.closest('select') || target.closest('[data-radix-collection-item]')) {
              e.preventDefault();
            }
          }}
        >
          <div className="mx-auto mt-3 h-1.5 w-16 rounded-full bg-muted md:hidden" />
          <div className="flex min-h-0 flex-1 flex-col">
            <header
              className={cn(
                "sticky top-0 z-20 border-b border-border bg-background px-6 py-6 pb-4 text-left",
                headerClassName,
              )}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
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
                "flex-1 overflow-y-auto overscroll-contain min-h-0",
                "[&::-webkit-scrollbar]:w-2",
                // Consistent padding: px-6 py-6
                "px-6 py-6",
                // Safe-area padding only on mobile when footer is sticky
                stickyFooterOnMobile && "supports-[padding:env(safe-area-inset-bottom)]:pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-4",
                contentClassName,
              )}
              style={{ WebkitOverflowScrolling: "touch" }}
              data-studio-modal-body
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {children}
            </div>
          </div>

          {footer && (
            <footer
              className={cn(
                "mt-auto shrink-0 border-t border-border bg-background px-6 py-4",
                // Sticky only on mobile when requested, never sticky on desktop
                stickyFooterOnMobile ? "sticky bottom-0 md:relative md:bottom-auto" : "",
                // Safe-area padding only on mobile
                stickyFooterOnMobile && "supports-[padding:env(safe-area-inset-bottom)]:pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-4",
              )}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {footer}
            </footer>
          )}
        </DrawerPrimitive.Content>
      </DrawerPortal>
    </DrawerRoot>
  );
};
