"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlert } from "@/components/shared/error-alert";
import type { Supplier } from "@prisma/client";

type SupplierFormProps = {
  orgSlug: string;
  supplier?: Supplier;
  action: (
    prev: { error?: string },
    formData: FormData,
  ) => Promise<{ error?: string }>;
  submitLabel: string;
};

export function SupplierForm({ orgSlug, supplier, action, submitLabel }: SupplierFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-6">
      {state.error && <ErrorAlert message={state.error} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Name *</Label>
          <Input id="name" name="name" required defaultValue={supplier?.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={supplier?.phone ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={supplier?.email ?? ""} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="addressLine1">Address line 1</Label>
          <Input id="addressLine1" name="addressLine1" defaultValue={supplier?.addressLine1 ?? ""} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="addressLine2">Address line 2</Label>
          <Input id="addressLine2" name="addressLine2" defaultValue={supplier?.addressLine2 ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={supplier?.city ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input id="state" name="state" defaultValue={supplier?.state ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="postalCode">Postal code</Label>
          <Input id="postalCode" name="postalCode" defaultValue={supplier?.postalCode ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gstin">GSTIN</Label>
          <Input id="gstin" name="gstin" defaultValue={supplier?.gstin ?? ""} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" defaultValue={supplier?.notes ?? ""} rows={3} />
        </div>
        {supplier && (
          <input type="hidden" name="isActive" value={supplier.isActive ? "true" : "false"} />
        )}
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        <Button type="button" variant="outline" asChild>
          <a href={supplier ? `/${orgSlug}/suppliers/${supplier.id}` : `/${orgSlug}/suppliers`}>
            Cancel
          </a>
        </Button>
      </div>
    </form>
  );
}
