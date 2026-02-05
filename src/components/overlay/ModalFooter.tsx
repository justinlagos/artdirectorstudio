/**
 * Modal Footer Component
 * Primary CTA right, secondary actions left
 * Sticky at bottom with subtle border and background surface
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ModalFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  primaryAction?: React.ReactNode;
  secondaryActions?: React.ReactNode;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({
  children,
  primaryAction,
  secondaryActions,
  className,
  ...props
}) => {
  if (children) {
    return (
      <div
        className={cn(
          "sticky bottom-0",
          "border-t border-border bg-background/95 backdrop-blur-sm",
          "px-6 py-4",
          "pb-safe", // iOS safe area
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "sticky bottom-0",
        "border-t border-border bg-background/95 backdrop-blur-sm",
        "px-6 py-4",
        "pb-safe", // iOS safe area
        "flex items-center justify-between gap-4",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        {secondaryActions}
      </div>
      <div className="flex items-center gap-2">
        {primaryAction}
      </div>
    </div>
  );
};
