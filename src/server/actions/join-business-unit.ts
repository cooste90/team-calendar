"use server";

import { redirect } from "next/navigation";
import { joinFirstBusinessUnit } from "@/server/services/auth-sync";
import { getCurrentUser } from "@/server/session";

// The welcome page's Continue button. It can't use authedAction, because the person
// has no BU yet (authedAction's requireUser would send them back to the welcome page).
export async function joinBusinessUnit(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }
  await joinFirstBusinessUnit(user.id, String(formData.get("businessUnitId")));
  // If nothing valid was chosen, "/" sends them back to the welcome page.
  redirect("/");
}
