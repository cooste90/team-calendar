import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";

type Props = {
  title: string;
  children: ReactNode; // the message and the buttons
};

// The branded frame for the pages shown instead of the calendar: not found, something
// went wrong, and the session has ended. It's in the same style as the sign-in page.
export function StatusPage({ title, children }: Props) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <div className="flex flex-col items-center gap-2">
        <Logo size={48} />
        <p className="font-bold text-xl tracking-[-0.02em]">WestCal</p>
      </div>
      <div className="flex w-full max-w-md flex-col gap-4 rounded-dialog border bg-surface p-6 shadow-popover">
        <h1 className="font-semibold text-xl">{title}</h1>
        {children}
      </div>
    </main>
  );
}
