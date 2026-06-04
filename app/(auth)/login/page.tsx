import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <>
      <h1 className="mb-6 text-center text-2xl font-semibold">Sign in</h1>
      <Suspense fallback={<p className="text-center text-sm">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </>
  );
}
