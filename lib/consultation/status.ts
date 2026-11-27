export const availabilityValues = ["available", "busy", "offline", "appointment"] as const;
export type Availability = (typeof availabilityValues)[number];
export function isAvailability(value: unknown): value is Availability {
  return typeof value === "string" && availabilityValues.some(item => item === value);
}
export function availabilityLabel(value: unknown): string {
  switch (value) {
    case "available": return "Online & available";
    case "busy": return "Online · busy";
    case "appointment": return "By appointment only";
    case "offline": return "Offline";
    default: return "Status unavailable";
  }
}
export type PublicConsultation = {user_id: string; status: Availability; audio: boolean; video: boolean; fee_pkr: number|null; appointment: boolean};
