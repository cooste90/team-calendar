import { cn } from "cn";

// Someone's initials on the mockup's gradient circle. It's decorative: their name is
// always next to it or in a label. It looks the same in both themes, and the white text
// has at least 4.5:1 contrast on both ends of the gradient (the light theme's primary
// and sunset). Pass the size, e.g. className="size-9".
export function InitialsAvatar({ initials, className }: { initials: string; className: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#4f46e5,#c2410c)] font-semibold text-[0.8125rem] text-white forced-colors:border forced-colors:border-[CanvasText]",
        className,
      )}
    >
      {initials}
    </span>
  );
}
