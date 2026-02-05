/**
 * Modal Header Component
 * Title, description, close button aligned right
 */

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModalHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  onClose?: () => void;
  showClose?: boolean;
  leftIcon?: React.ReactNode;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  description,
  onClose,
  showClose = true,
  leftIcon,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        "flex items-start justify-between",
        "px-6 pt-6 pb-4",
        "border-b border-border",
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-3 flex-1">
        {leftIcon && <div className="mt-1">{leftIcon}</div>}
        <div className="flex-1">
          {title && (
            <h2 className="text-lg font-semibold text-foreground leading-tight">
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
      {showClose && onClose && (
        <button
          onClick={onClose}
          className={cn(
            "rounded-sm opacity-70 ring-offset-background",
            "transition-opacity hover:opacity-100",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "min-w-[44px] min-h-[44px] flex items-center justify-center",
            "touch-manipulation"
          )}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
