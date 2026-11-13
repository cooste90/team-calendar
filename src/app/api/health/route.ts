import { db } from "@/server/db";

// Used by Docker and Kubernetes to check the app and its database are working.
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", db: "ok" });
  } catch (error) {
    console.error("Health check failed", error);
    return Response.json({ status: "error", db: "unreachable" }, { status: 503 });
  }
}
