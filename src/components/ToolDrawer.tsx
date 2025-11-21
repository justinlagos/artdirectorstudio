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
    <DrawerRoot open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerPortal>
        <DrawerOverlay className="backdrop-blur-sm" />
        <DrawerPrimitive.Content
          className={cn(
            "fixed z-modal-content flex max-h-[90dvh] flex-col border border-border bg-background shadow-xl overflow-hidden",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "duration-200 ease-in-out",
            // Mobile: bottom sheet centered horizontally with slide animation from bottom-center
            "left-0 right-0 mx-auto bottom-0 rounded-t-2xl",
            "w-full max-w-full",
            "data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            // Desktop: centered modal with fade/zoom only, no slide
            "md:left-1/2 md:right-auto md:mx-0 md:bottom-auto md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:max-w-[820px] md:w-[90vw] md:max-h-[90vh]",
            "md:data-[state=open]:fade-in-0 md:data-[state=closed]:fade-out-0",
            "md:data-[state=open]:zoom-in-95 md:data-[state=closed]:zoom-out-95",
            className,
          )}
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
                // Sticky only on mobile when requested
                stickyFooterOnMobile ? "sticky bottom-0" : "",
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
