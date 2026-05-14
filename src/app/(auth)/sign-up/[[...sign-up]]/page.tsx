import { SignUp } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10">
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/dashboard"
      />
    </main>
  );
}
