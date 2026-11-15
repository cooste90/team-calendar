import { pingDatabase } from "@/server/queries/health";

// Used by Docker and Kubernetes to check the app and its database are working.
export async function GET() {
  try {
    await pingDatabase();
    return Response.json({ status: "ok", db: "ok" });
  } catch (error) {
    console.error("Health check failed", error);
    return Response.json({ status: "error", db: "unreachable" }, { status: 503 });
  }
}
