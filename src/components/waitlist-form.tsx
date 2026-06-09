"use client";

import { ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react";
import { useState } from "react";

type FormStatus =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success"; alreadyJoined: boolean }
  | { state: "error"; message: string };

export function WaitlistForm({
  niche,
  source,
  buttonLabel = "Get early access",
}: {
  niche: string;
  source?: string;
  buttonLabel?: string;
}) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<FormStatus>({ state: "idle" });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (status.state === "submitting") {
      return;
    }

    setStatus({ state: "submitting" });

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, niche, source, company }),
      });
      const body = (await response.json().catch(() => null)) as
        | { alreadyJoined?: boolean; error?: string }
        | null;

      if (!response.ok) {
        setStatus({
          state: "error",
          message: body?.error ?? "Something went wrong. Please try again.",
        });
        return;
      }

      setStatus({ state: "success", alreadyJoined: body?.alreadyJoined ?? false });
    } catch {
      setStatus({ state: "error", message: "Network error. Please try again." });
    }
  }

  if (status.state === "success") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-300/25 bg-emerald-300/[0.08] px-4 py-3.5 text-sm font-semibold text-emerald-100">
        <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
        {status.alreadyJoined
          ? "You're already on the list — we'll be in touch soon."
          : "You're on the list. We'll email you when your spot opens."}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          aria-label="Email address"
          className="studio-input h-12 flex-1 px-4 text-base"
        />
        <input
          type="text"
          value={company}
          onChange={(event) => setCompany(event.target.value)}
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />
        <button
          type="submit"
          disabled={status.state === "submitting"}
          className="studio-button-primary !h-12 px-6 text-base disabled:opacity-60"
        >
          {status.state === "submitting" ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <>
              {buttonLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      </div>
      {status.state === "error" ? (
        <p className="text-sm text-rose-300">{status.message}</p>
      ) : (
        <p className="text-sm text-slate-400">Free during beta. No credit card.</p>
      )}
    </form>
  );
}
