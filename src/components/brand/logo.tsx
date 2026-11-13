// The WestCal logo: an apricot sun setting over a horizon, on a Dusk indigo square.
// Pass `label` when the logo stands alone; without it the logo is decorative (hidden
// from screen readers), e.g. next to the wordmark.
export function Logo({ size = 28, label }: { size?: number; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <rect width="32" height="32" rx="9" fill="#4f46e5" />
      <path d="M9 19a7 7 0 0 1 14 0z" fill="#fdba74" />
      <rect x="6" y="20.5" width="20" height="2" rx="1" fill="#ffffff" />
      <rect x="10" y="24" width="12" height="2" rx="1" fill="#ffffff" opacity=".55" />
    </svg>
  );
}
