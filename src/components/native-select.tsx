import { cn } from "cn";
import { ChevronDownIcon } from "lucide-react";
import type { ComponentProps } from "react";

// A plain <select> styled like the header buttons, with a chevron. The browser's own
// select is fully keyboard and screen-reader friendly, so no custom dropdown is needed.
export function NativeSelect({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <span className="relative inline-flex">
      <select
        className={cn(
          "h-9 cursor-pointer appearance-none rounded-[10px] border bg-surface pr-8 pl-3 font-medium hover:bg-surface-2",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
      />
    </span>
  );
}
