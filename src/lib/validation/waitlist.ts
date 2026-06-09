import { z } from "zod";

import { nicheSlugs } from "@/lib/niches";

const waitlistSchema = z.object({
  email: z.string().trim().toLowerCase().min(3).max(254).email("Enter a valid email address."),
  niche: z.string().refine((value) => nicheSlugs.includes(value) || value === "general", {
    message: "Unknown niche.",
  }),
  source: z.string().trim().max(120).optional(),
  // Honeypot: real users never fill this field, bots do.
  company: z
    .string()
    .max(0, "Invalid submission.")
    .optional(),
});

export type WaitlistInput = Omit<z.infer<typeof waitlistSchema>, "company">;

export function parseWaitlistInput(
  payload: unknown,
):
  | { success: true; data: WaitlistInput }
  | { success: false; errors: string[] } {
  const parsed = waitlistSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.issues.map((issue) => issue.message),
    };
  }

  const { email, niche, source } = parsed.data;
  return { success: true, data: { email, niche, source } };
}
