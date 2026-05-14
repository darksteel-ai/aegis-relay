import { SignIn } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10">
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/dashboard"
      />
    </main>
  );
}
