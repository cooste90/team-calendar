import { Button } from "@/components/ui/button";

// Shown instead of the grid when the filters match nobody.
export function NoMatchesMessage({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="mx-5 mb-3 rounded-2xl border bg-surface px-6 py-8 text-center">
      <p className="font-semibold">No one matches these filters.</p>
      <Button variant="outline" className="mt-3" onClick={onClearFilters}>
        Clear filters
      </Button>
    </div>
  );
}
