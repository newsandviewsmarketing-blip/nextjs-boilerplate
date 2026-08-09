"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isAllowedSelfRegistrationRole } from "@/lib/auth";

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function withMessage(path: string, kind: "error" | "message", text: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${kind}=${encodeURIComponent(text)}`;
}

function ensureConfigured(path: string) {
  if (!isSupabaseConfigured()) {
    redirect(withMessage(path, "error", "Backend is not configured yet."));
  }
}

export async function loginAction(formData: FormData) {
  ensureConfigured("/login");
  const email = value(formData, "email").toLowerCase();
  const password = value(formData, "password");
  const nextValue = value(formData, "next");
  const next =
    nextValue.startsWith("/") && !nextValue.startsWith("//")
      ? nextValue
      : "/dashboard";

  if (!email || !password) {
    redirect(withMessage("/login", "error", "Enter your email and password."));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(withMessage("/login", "error", error.message));
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function requestLoginOtpAction(formData: FormData) {
  ensureConfigured("/login");
  const email = value(formData, "email").toLowerCase();
  const nextValue = value(formData, "next");
  const next =
    nextValue.startsWith("/") && !nextValue.startsWith("//")
      ? nextValue
      : "/dashboard";

  if (!email) {
    redirect(withMessage("/login", "error", "Enter your email address."));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  if (error) {
    redirect(withMessage("/login", "error", error.message));
  }

  redirect(
    `/verify-email?mode=login&email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}&message=${encodeURIComponent("A six-digit verification code has been sent to your email.")}`,
  );
}

export async function requestRegistrationOtpAction(formData: FormData) {
  ensureConfigured("/register");
  const fullName = value(formData, "full_name");
  const email = value(formData, "email").toLowerCase();
  const role = value(formData, "role");
  const city = value(formData, "city");
  const phone = value(formData, "phone");
  const pvmcNumber = value(formData, "pvmc_number");
  const organizationName = value(formData, "organization_name");

  if (!fullName || !email || !role) {
    redirect(withMessage("/register", "error", "Complete all required fields."));
  }
  if (!isAllowedSelfRegistrationRole(role)) {
    redirect(withMessage("/register", "error", "Choose a valid account type."));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      data: {
        full_name: fullName,
        role,
        city,
        phone,
        pvmc_number: pvmcNumber,
        organization_name: organizationName,
      },
    },
  });
  if (error) {
    redirect(withMessage("/register", "error", error.message));
  }

  redirect(
    `/verify-email?mode=register&email=${encodeURIComponent(email)}&next=${encodeURIComponent("/dashboard")}&message=${encodeURIComponent("Your VetConnect verification code has been sent by email.")}`,
  );
}

export async function resendEmailOtpAction(formData: FormData) {
  ensureConfigured("/login");
  const email = value(formData, "email").toLowerCase();
  const mode = value(formData, "mode") === "register" ? "register" : "login";
  const nextValue = value(formData, "next");
  const next =
    nextValue.startsWith("/") && !nextValue.startsWith("//")
      ? nextValue
      : "/dashboard";
  if (!email) redirect("/login?error=Enter%20your%20email%20address.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: mode === "register" },
  });
  if (error) {
    redirect(
      `/verify-email?mode=${mode}&email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}&error=${encodeURIComponent(error.message)}`,
    );
  }
  redirect(
    `/verify-email?mode=${mode}&email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}&message=${encodeURIComponent("A new verification code has been sent.")}`,
  );
}

export async function verifyEmailOtpAction(formData: FormData) {
  ensureConfigured("/login");
  const email = value(formData, "email").toLowerCase();
  const token = value(formData, "token").replace(/\s/g, "");
  const mode = value(formData, "mode") === "register" ? "register" : "login";
  const nextValue = value(formData, "next");
  const next =
    nextValue.startsWith("/") && !nextValue.startsWith("//")
      ? nextValue
      : "/dashboard";

  if (!email || !/^\d{6,10}$/.test(token)) {
    redirect(
      `/verify-email?mode=${mode}&email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}&error=${encodeURIComponent("Enter the complete verification code.")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  if (error) {
    redirect(
      `/verify-email?mode=${mode}&email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}&error=${encodeURIComponent("The code is invalid or has expired. Request a new code and try again.")}`,
    );
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function registerAction(formData: FormData) {
  ensureConfigured("/register");
  const fullName = value(formData, "full_name");
  const email = value(formData, "email").toLowerCase();
  const password = value(formData, "password");
  const confirmPassword = value(formData, "confirm_password");
  const role = value(formData, "role");
  const city = value(formData, "city");
  const phone = value(formData, "phone");
  const pvmcNumber = value(formData, "pvmc_number");
  const organizationName = value(formData, "organization_name");

  if (!fullName || !email || !password || !role) {
    redirect(
      withMessage("/register", "error", "Complete all required fields."),
    );
  }
  if (!isAllowedSelfRegistrationRole(role)) {
    redirect(withMessage("/register", "error", "Choose a valid account type."));
  }
  if (password.length < 8) {
    redirect(
      withMessage(
        "/register",
        "error",
        "Password must contain at least 8 characters.",
      ),
    );
  }
  if (password !== confirmPassword) {
    redirect(withMessage("/register", "error", "Passwords do not match."));
  }

  const headerStore = await headers();
  const origin =
    headerStore.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://www.vetconnect.com.pk";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=/dashboard`,
      data: {
        full_name: fullName,
        role,
        city,
        phone,
        pvmc_number: pvmcNumber,
        organization_name: organizationName,
      },
    },
  });

  if (error) {
    redirect(withMessage("/register", "error", error.message));
  }

  if (!data.session) {
    redirect(
      withMessage(
        "/login",
        "message",
        "Account created. Check your email to confirm your address, then sign in.",
      ),
    );
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function requestPasswordResetAction(formData: FormData) {
  ensureConfigured("/forgot-password");
  const email = value(formData, "email").toLowerCase();
  if (!email) {
    redirect(
      withMessage("/forgot-password", "error", "Enter your email address."),
    );
  }

  const headerStore = await headers();
  const origin =
    headerStore.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://www.vetconnect.com.pk";
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/update-password`,
  });
  if (error) {
    redirect(withMessage("/forgot-password", "error", error.message));
  }
  redirect(
    withMessage(
      "/forgot-password",
      "message",
      "If this email is registered, a password reset message has been sent.",
    ),
  );
}

export async function updatePasswordAction(formData: FormData) {
  ensureConfigured("/update-password");
  const password = value(formData, "password");
  const confirmPassword = value(formData, "confirm_password");
  if (password.length < 8) {
    redirect(
      withMessage(
        "/update-password",
        "error",
        "Password must contain at least 8 characters.",
      ),
    );
  }
  if (password !== confirmPassword) {
    redirect(
      withMessage("/update-password", "error", "Passwords do not match."),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(withMessage("/update-password", "error", error.message));
  }
  redirect(
    withMessage("/login", "message", "Password updated. You can now sign in."),
  );
}

export async function signOutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/");
}
