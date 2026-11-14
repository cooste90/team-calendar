"use server";

import { redirect } from "next/navigation";
import { joinFirstBusinessUnit } from "@/server/auth-sync";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/session";

// The welcome page's Continue button.
export async function joinBusinessUnit(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }
  const businessUnit = await db.businessUnit.findUnique({
    where: { id: String(formData.get("businessUnitId")) },
  });
  if (businessUnit) {
    await joinFirstBusinessUnit(user.id, businessUnit.id);
  }
  // If nothing valid was chosen, "/" sends them back to the welcome page.
  redirect("/");
}
