"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { registerOrganization, type SignupState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slugify } from "@/lib/slug";

const initialState: SignupState = {};

export function SignupForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    registerOrganization,
    initialState,
  );

  useEffect(() => {
    if (!state.success || !state.slug) return;

    void (async () => {
      const form = document.getElementById("signup-form") as HTMLFormElement | null;
      if (!form) return;
      const fd = new FormData(form);
      await signIn("credentials", {
        email: fd.get("email") as string,
        password: fd.get("password") as string,
        redirect: false,
      });
      router.push(`/${state.slug}`);
      router.refresh();
    })();
  }, [state.success, state.slug, router]);

  return (
    <form id="signup-form" action={formAction} className="space-y-4">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {state.error}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="name">Your name</Label>
        <Input id="name" name="name" required autoComplete="name" />
        {state.fieldErrors?.name && (
          <p className="text-xs text-red-600">{state.fieldErrors.name[0]}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
        {state.fieldErrors?.email && (
          <p className="text-xs text-red-600">{state.fieldErrors.email[0]}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        {state.fieldErrors?.password && (
          <p className="text-xs text-red-600">{state.fieldErrors.password[0]}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="businessName">Business name</Label>
        <Input id="businessName" name="businessName" required />
        {state.fieldErrors?.businessName && (
          <p className="text-xs text-red-600">{state.fieldErrors.businessName[0]}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">Workspace URL (optional)</Label>
        <div className="flex items-center gap-1 text-sm text-zinc-500">
          <span>packflow.app/</span>
          <Input
            id="slug"
            name="slug"
            className="flex-1"
            placeholder={slugify("my-company")}
            onChange={(e) => {
              e.target.value = slugify(e.target.value);
            }}
          />
        </div>
        {state.fieldErrors?.slug && (
          <p className="text-xs text-red-600">{state.fieldErrors.slug[0]}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating workspace…" : "Create workspace"}
      </Button>
      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-zinc-900 underline dark:text-zinc-50">
          Sign in
        </Link>
      </p>
    </form>
  );
}
