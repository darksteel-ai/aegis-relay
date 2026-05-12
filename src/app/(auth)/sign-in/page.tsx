"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { ArrowRight, Mail } from "lucide-react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const result = await signIn("email", {
      email,
      callbackUrl: "/dashboard",
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setMessage("We could not send that sign-in link. Check the email address and try again.");
      return;
    }

    setMessage("Check your email for a secure sign-in link.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10 text-neutral-950">
      <section className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-medium text-neutral-500">Video Scheduler</p>
          <h1 className="text-2xl font-semibold tracking-normal">Sign in to your workspace</h1>
          <p className="text-sm leading-6 text-neutral-600">
            Enter your email and we will send a secure link to continue.
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-neutral-800">
              Email address
            </label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                aria-hidden="true"
              />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 w-full rounded-md border border-neutral-300 bg-white pl-10 pr-3 text-sm outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-950 focus:ring-2 focus:ring-neutral-200"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
          >
            {isSubmitting ? "Sending link" : "Send sign-in link"}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>

          {message ? (
            <p className="rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-700" role="status">
              {message}
            </p>
          ) : null}
        </form>
      </section>
    </main>
  );
}
