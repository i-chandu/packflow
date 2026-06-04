import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <>
      <h1 className="mb-2 text-center text-2xl font-semibold">Create your workspace</h1>
      <p className="mb-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
        Set up your broker account in minutes.
      </p>
      <SignupForm />
    </>
  );
}
