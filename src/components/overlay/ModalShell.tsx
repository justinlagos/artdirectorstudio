/**
 * Unified Modal Shell
 * 
 * Desktop: Centered dialog using Radix Dialog
 * Mobile: Bottom sheet using Vaul drawer
 * 
 * Rules:
 * - Max width defined by size prop
 * - Always vertically and horizontally centered (desktop)
 * - Scroll inside modal, never page
 * - One primary action only
 * - Secondary actions subdued
 * - Mobile: Bottom sheet pattern, full-width, thumb reachable CTA
 */

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Drawer } from "vaul";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useScrollLock } from "@/hooks/useScrollLock";

export interface ModalShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl";
  footer?: React.ReactNode;
  children: React.ReactNode;
  isBlocking?: boolean; // Prevents closing while running
  initialFocusRef?: React.RefObject<HTMLElement>;
  className?: string;
}

const sizeClasses = {
  sm: "max-w-[var(--modal-sm)]",
  md: "max-w-[var(--modal-md)]",
  lg: "max-w-[var(--modal-lg)]",
  xl: "max-w-[var(--modal-xl)]",
};

export const ModalShell: React.FC<ModalShellProps> = ({
  open,
  onOpenChange,
  title,
  description,
  size = "md",
  footer,
  children,
  isBlocking = false,
  initialFocusRef,
  className,
}) => {
  const isMobile = useIsMobile();
  useScrollLock(open, 'modal-shell', true);

  const handleOpenChange = (newOpen: boolean) => {
    if (!isBlocking) {
      onOpenChange(newOpen);
    }
  };

  // Mobile: Use Vaul drawer (bottom sheet)
  if (isMobile) {
    return (
      <Drawer.Root open={open} onOpenChange={handleOpenChange} dismissible={!isBlocking}>
        <Drawer.Overlay className="fixed inset-0 z-[var(--z-modal-backdrop)] bg-black/60 backdrop-blur-sm" />
        <Drawer.Portal>
          <Drawer.Content
            className={cn(
              "fixed bottom-0 left-0 right-0 z-[var(--z-modal)]",
              "bg-background rounded-t-[var(--radius-lg)]",
              "max-h-[92vh] flex flex-col",
              "touch-manipulation"
            )}
          >
            {/* Handle bar */}
            <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-muted-foreground/20" />
            
            {/* Header */}
            {(title || description) && (
              <div className="flex items-start justify-between px-6 pt-4 pb-2">
                <div className="flex-1">
                  {title && (
                    <Drawer.Title className="text-lg font-semibold text-foreground">
                      {title}
                    </Drawer.Title>
                  )}
                  {description && (
                    <Drawer.Description className="mt-1 text-sm text-muted-foreground">
                      {description}
                    </Drawer.Description>
                  )}
                </div>
                {!isBlocking && (
                  <Drawer.Close className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-w-[44px] min-h-[44px] flex items-center justify-center">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </Drawer.Close>
                )}
              </div>
            )}

            {/* Body - scrollable */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4" style={{ WebkitOverflowScrolling: 'touch' }}>
              {children}
            </div>

            {/* Footer - sticky bottom */}
            {footer && (
              <div className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur-sm px-6 py-4 pb-safe">
                {footer}
              </div>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  // Desktop: Use Radix Dialog (centered)
  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-[var(--z-modal-backdrop)]",
            "bg-black/80 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "duration-[var(--dur-2)]"
          )}
        />
        <DialogPrimitive.Content
          onOpenAutoFocus={(e) => {
            if (initialFocusRef?.current) {
              e.preventDefault();
              initialFocusRef.current.focus();
            }
          }}
          onEscapeKeyDown={(e) => {
            if (isBlocking) {
              e.preventDefault();
            }
          }}
          onPointerDownOutside={(e) => {
            if (isBlocking) {
              e.preventDefault();
            }
          }}
          className={cn(
            "fixed left-[50%] top-[50%] z-[var(--z-modal)]",
            "grid w-full gap-0 border bg-background shadow-lg",
            "max-h-[var(--modal-max-h)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
            "rounded-[var(--radius-md)] overflow-hidden",
            "duration-[var(--dur-2)]",
            sizeClasses[size],
            className
          )}
          style={{
            transform: 'translate(-50%, -50%)',
            WebkitTransform: 'translate(-50%, -50%)',
          }}
        >
          {/* Header */}
          {(title || description) && (
            <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border">
              <div className="flex-1">
                {title && (
                  <DialogPrimitive.Title className="text-lg font-semibold text-foreground">
                    {title}
                  </DialogPrimitive.Title>
                )}
                {description && (
                  <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                    {description}
                  </DialogPrimitive.Description>
                )}
              </div>
              {!isBlocking && (
                <DialogPrimitive.Close className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-w-[44px] min-h-[44px] flex items-center justify-center">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </DialogPrimitive.Close>
              )}
            </div>
          )}

          {/* Body - scrollable */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-6">
            {children}
          </div>

          {/* Footer - sticky bottom */}
          {footer && (
            <div className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur-sm px-6 py-4">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
