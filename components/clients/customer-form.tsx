"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlert } from "@/components/shared/error-alert";
import type { Customer } from "@prisma/client";

type CustomerFormProps = {
  orgSlug: string;
  customer?: Customer;
  showOpeningBalance?: boolean;
  action: (
    prev: { error?: string },
    formData: FormData,
  ) => Promise<{ error?: string }>;
  submitLabel: string;
};

export function CustomerForm({
  orgSlug,
  customer,
  showOpeningBalance = false,
  action,
  submitLabel,
}: CustomerFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-6">
      {state.error && <ErrorAlert message={state.error} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Name *</Label>
          <Input id="name" name="name" required defaultValue={customer?.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={customer?.phone ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={customer?.email ?? ""} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="addressLine1">Address</Label>
          <Input id="addressLine1" name="addressLine1" defaultValue={customer?.addressLine1 ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={customer?.city ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="billingState">State</Label>
          <Input id="billingState" name="billingState" defaultValue={customer?.billingState ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="postalCode">Postal code</Label>
          <Input id="postalCode" name="postalCode" defaultValue={customer?.postalCode ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gstin">GSTIN</Label>
          <Input id="gstin" name="gstin" defaultValue={customer?.gstin ?? ""} />
        </div>
        {showOpeningBalance && (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="openingBalance">Opening balance (₹)</Label>
            <Input
              id="openingBalance"
              name="openingBalance"
              type="number"
              step="0.01"
              min="0"
              defaultValue={0}
            />
            <p className="text-xs text-zinc-500">
              Recorded as opening balance on the client ledger.
            </p>
          </div>
        )}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" defaultValue={customer?.notes ?? ""} rows={3} />
        </div>
        {customer && (
          <input type="hidden" name="isActive" value={customer.isActive ? "true" : "false"} />
        )}
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        <Button type="button" variant="outline" asChild>
          <a href={customer ? `/${orgSlug}/clients/${customer.id}` : `/${orgSlug}/clients`}>
            Cancel
          </a>
        </Button>
      </div>
    </form>
  );
}
