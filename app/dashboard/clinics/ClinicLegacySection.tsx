"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const legacySections = new Map([
  ["#clinic-identity", "profile"],
  ["#clinic-hours", "availability"],
  ["#clinic-date-exceptions", "availability"],
  ["#clinic-services", "services"],
  ["#clinic-team", "team"],
  ["#clinic-appointments", "appointments"],
]);

export default function ClinicLegacySection() {
  const router = useRouter();
  useEffect(() => {
    const url = new URL(window.location.href);
    const section = legacySections.get(url.hash);
    if (section) {
      url.searchParams.set("section", section);
      router.replace(url.pathname + url.search + url.hash);
    }
  }, [router]);
  return null;
}
