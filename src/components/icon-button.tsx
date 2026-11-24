import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Props = ComponentProps<typeof Button> & {
  label: string; // what the button does, e.g. "Rename Legal"
};

// A button that shows only an icon. The label is its name for screen readers and its
// tooltip, so everyone can find out what it does.
export function IconButton({ label, variant = "ghost", size = "icon", ...props }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant={variant} size={size} aria-label={label} {...props} />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
