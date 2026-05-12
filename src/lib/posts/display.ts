import { isValidTimeZone } from "@/lib/posts/create";

export function formatScheduledAtForDashboard(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: isValidTimeZone(timezone) ? timezone : "UTC",
  }).format(date);
}
