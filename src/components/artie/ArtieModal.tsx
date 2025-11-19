import { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useScrollLock } from "@/hooks/useScrollLock";

interface ArtieModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  preventBodyScroll?: boolean;
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  full: "max-w-[1040px]",
};

export const ArtieModal = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  contentClassName,
  maxWidth = "full",
  preventBodyScroll = true,
}: ArtieModalProps) => {
  const isMobile = useIsMobile();

  // Use centralized scroll lock manager
  useScrollLock(open, 'artie-modal', preventBodyScroll);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Overlay - Semi-transparent dark overlay, click closes modal */}
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "duration-200"
          )}
        />

        {/* Content */}
        <DialogPrimitive.Content
          className={cn(
            "fixed z-[91]",
            // Mobile: bottom sheet with safe-area padding
            isMobile
              ? [
                  "inset-x-0 bottom-0 top-auto",
                  "rounded-t-2xl border-t border-l border-r border-border",
                  "bg-background shadow-xl max-h-[96dvh]",
                  "pb-[env(safe-area-inset-bottom)]",
                  "data-[state=open]:animate-in data-[state=closed]:animate-out",
                  "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                  "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
                  "duration-200",
                ]
              : // Desktop: centered modal with fade+scale animation
                [
                  "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
                  "rounded-2xl border border-border bg-background shadow-lg",
                  "w-[90vw] max-h-[90vh]",
                  maxWidthClasses[maxWidth],
                  // Ensure minimum width for full size modals
                  maxWidth === "full" && "min-w-[min(960px,90vw)]",
                  "data-[state=open]:animate-in data-[state=closed]:animate-out",
                  "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                  "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                  "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
                  "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
                  "duration-200",
                ],
            className
          )}
          onOpenAutoFocus={(e) => {
            // Prevent auto focus on mobile to avoid keyboard opening
            if (isMobile) {
              e.preventDefault();
            }
          }}
        >
          {/* Mobile handle */}
          {isMobile && (
            <div className="mx-auto mt-3 h-1.5 w-16 rounded-full bg-muted shrink-0" />
          )}

          <div className="flex min-h-0 flex-1 flex-col max-h-[90vh]">
            {/* Header - Fixed, no scroll */}
            <header
              className={cn(
                "flex-shrink-0 border-b border-border bg-background",
                isMobile ? "px-6 py-5" : "px-8 py-6"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <DialogPrimitive.Title
                    className={cn(
                      "text-lg font-semibold leading-none tracking-tight",
                      isMobile ? "text-base" : "text-xl"
                    )}
                  >
                    {title}
                  </DialogPrimitive.Title>
                  {description && (
                    <DialogPrimitive.Description
                      className={cn(
                        "mt-2 text-sm text-muted-foreground",
                        isMobile ? "text-xs" : "text-sm"
                      )}
                    >
                      {description}
                    </DialogPrimitive.Description>
                  )}
                </div>
                <DialogPrimitive.Close
                  className={cn(
                    "rounded-sm opacity-70 ring-offset-background transition-opacity",
                    "hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    "disabled:pointer-events-none",
                    "min-w-[44px] min-h-[44px] flex items-center justify-center",
                    "bg-background/80 backdrop-blur-sm"
                  )}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </DialogPrimitive.Close>
              </div>
            </header>

            {/* Body - Scrollable, only this section scrolls */}
            <div
              className={cn(
                "flex-1 overflow-y-auto overscroll-contain min-h-0",
                "[&::-webkit-scrollbar]:w-2",
                // Content area padding: px-6 py-5 mobile, px-8 py-6 desktop
                isMobile
                  ? "px-6 py-5"
                  : "px-8 py-6",
                contentClassName
              )}
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {children}
            </div>

            {/* Footer - Fixed at bottom, no scroll */}
            {footer && (
              <footer
                className={cn(
                  "flex-shrink-0 border-t border-border bg-background",
                  isMobile
                    ? "px-6 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
                    : "px-8 py-6"
                )}
              >
                {footer}
              </footer>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

