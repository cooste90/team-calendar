import { expect, it } from "vitest";
import { GET } from "@/app/api/health/route";

it("the health check reports ok when the database is reachable", async () => {
  const response = await GET();

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "ok", db: "ok" });
});
