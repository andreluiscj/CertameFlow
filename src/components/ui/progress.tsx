import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { showPercentage?: boolean }
>(({ className, value, showPercentage, ...props }, ref) => {
  const pct = value || 0;
  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(-${100 - pct}%)` }}
      />
      {showPercentage && (
        <>
          {/* Text on unfilled area: primary color */}
          <span
            className="absolute inset-0 flex items-center justify-center text-[10px] font-bold leading-none text-primary"
            style={{ clipPath: `inset(0 0 0 ${pct}%)` }}
          >
            {Math.round(pct)}%
          </span>
          {/* Text on filled area: white */}
          <span
            className="absolute inset-0 flex items-center justify-center text-[10px] font-bold leading-none text-primary-foreground"
            style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
          >
            {Math.round(pct)}%
          </span>
        </>
      )}
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
