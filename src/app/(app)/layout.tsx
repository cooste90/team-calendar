import { LiveRegion } from "@/components/live-region";
import { Toaster } from "@/components/ui/sonner";

// The signed-in part of the app. Each page checks the session itself (requireUser);
// a layout can't, because it doesn't re-render on every navigation.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {children}
      <Toaster />
      <LiveRegion />
    </>
  );
}
