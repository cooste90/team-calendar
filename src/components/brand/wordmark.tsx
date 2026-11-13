import { Logo } from "./logo";

// Logo plus the "WestCal" name, as used in the header.
export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5 font-bold text-[1.0625rem] tracking-[-0.02em]">
      <Logo />
      WestCal
    </span>
  );
}
