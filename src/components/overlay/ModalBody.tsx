/**
 * Modal Body Component
 * Handles internal scrolling
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ModalBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const ModalBody: React.FC<ModalBodyProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        "flex-1 overflow-y-auto overscroll-contain",
        "px-6 py-6",
        "max-h-[var(--modal-max-h)]",
        className
      )}
      style={{ WebkitOverflowScrolling: 'touch' }}
      {...props}
    >
      {children}
    </div>
  );
};
