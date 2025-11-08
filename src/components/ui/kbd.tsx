import * as React from "react";
import { cn } from "@/lib/utils";

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {}

const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  ({ className, ...props }, ref) => {
    return (
      <kbd
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded border border-border bg-muted px-2 py-1 text-xs font-semibold text-foreground shadow-sm min-w-[1.75rem] h-6",
          className
        )}
        {...props}
      />
    );
  }
);
Kbd.displayName = "Kbd";

export { Kbd };
