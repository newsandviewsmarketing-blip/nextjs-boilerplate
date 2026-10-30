type NotificationInput = { email: string; name: string; category: string; userId: string; decision?: "approved" | "rejected"; reason?: string };
const base = () => (process.env.VETCONNECT_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://vetconnect.com.pk").replace(/\/$/, "");
export async function notifyRegistrationSubmitted(input: NotificationInput) {
  const key = process.env.RESEND_API_KEY, to = process.env.VETCONNECT_ADMIN_EMAIL, from = process.env.VETCONNECT_NOTIFICATION_FROM;
  if (!key || !to || !from) { console.warn("Registration notice not sent: email configuration is incomplete."); return; }
  const url = base() + "/admin/reviews";
  await send(key, from, to, "New VetConnect registration awaiting review", `A new ${input.category} registration from ${input.name} (${input.email}) is waiting for review. Review securely: ${url}. No identity documents are attached.`);
}
export async function notifyRegistrationDecision(input: NotificationInput) {
  const key = process.env.RESEND_API_KEY, from = process.env.VETCONNECT_NOTIFICATION_FROM;
  if (!key || !from || !input.email) { console.warn("Registration status notice not sent: email configuration is incomplete."); return; }
  const status = input.decision === "approved" ? "approved" : "needs an update";
  const reason = input.reason ? `\nAdmin note: ${input.reason}` : "";
  await send(key, from, input.email, `VetConnect registration ${status}`, `Hello ${input.name}, your VetConnect registration ${status}.${reason}\nView your registration: ${base()}/register/status\nPlease do not reply with identity documents attached.`);
}
async function send(key: string, from: string, to: string, subject: string, textBody: string) {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text: textBody }),
    });
    if (!response.ok) console.error("VetConnect registration email request failed.", response.status);
  } catch (error) { console.error("VetConnect registration email request failed.", error); }
}
