import type * as React from "react";

import { cn } from "@/lib/utils";

function Callout({
  className,
  icon,
  title,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  icon?: React.ReactNode;
  title?: React.ReactNode;
}) {
  return (
    <div
      data-slot="callout"
      role="note"
      className={cn(
        "rounded-xl border border-border bg-muted/40 p-4 shadow-sm",
        className,
      )}
      {...props}
    >
      <div className="flex gap-3">
        {icon != null ? (
          <span className="text-xl leading-none select-none" aria-hidden>
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1 space-y-1.5">
          {title != null ? (
            <p className="text-sm font-medium text-foreground">{title}</p>
          ) : null}
          <div className="text-sm leading-relaxed text-muted-foreground">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export { Callout };
