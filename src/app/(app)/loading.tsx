import { Skeleton } from "@/components/ui/skeleton";

// Shown only for the very first load. Its blocks have the same sizes as the title and
// the grid, so nothing jumps when the real page arrives. Moving between periods keeps
// the old grid on screen (dimmed) instead.
export default function Loading() {
  return (
    <div>
      <p className="sr-only">Loading the calendar…</p>
      <div className="px-5 pt-[1.125rem] pb-3">
        <Skeleton className="h-7 w-64" />
      </div>
      <div className="mx-5 mb-6 overflow-hidden rounded-2xl border bg-surface">
        <Skeleton className="h-[3.375rem] rounded-none" />
        {Array.from({ length: 10 }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: identical placeholder rows that never reorder.
          <div key={index} className="flex h-[2.625rem] items-center gap-3 border-t px-3.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-6 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}
