import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { registrationEvidenceRequirements } from "@/lib/registration-evidence";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PrivateWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (user) {
    const { data: gate, error: gateError } = await supabase.from("registration_completion_gate")
      .select("completed_at,review_status").eq("user_id", user.id).maybeSingle();
    if (gateError) redirect("/register/complete?error=Registration%20status%20could%20not%20be%20verified.%20Please%20try%20again.");
    if (gate && !gate.completed_at) redirect("/register/complete");
    if (gate?.completed_at && gate.review_status === "pending") redirect("/register/status");
    if (gate?.completed_at && gate.review_status === "rejected") redirect("/register/complete");
    if (!gate && user.user_metadata?.registration_details_pending === true) redirect("/register/complete");
  }
  return children;
}
