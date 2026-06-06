"use client";

import { useActionState } from "react";
import type { OrganizationFormState } from "@/app/actions/organization";
import { ErrorAlert } from "@/components/shared/error-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Organization } from "@prisma/client";

export function OrgSettingsForm({
  organization,
  action,
}: {
  organization: Organization;
  action: (
    prev: OrganizationFormState,
    formData: FormData,
  ) => Promise<OrganizationFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-8">
      {state.error && <ErrorAlert message={state.error} />}

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-zinc-500">Company</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Display name *</Label>
            <Input id="name" name="name" required defaultValue={organization.name} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="legalName">Legal name</Label>
            <Input
              id="legalName"
              name="legalName"
              defaultValue={organization.legalName ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gstin">GSTIN</Label>
            <Input id="gstin" name="gstin" defaultValue={organization.gstin ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoicePrefix">Invoice prefix *</Label>
            <Input
              id="invoicePrefix"
              name="invoicePrefix"
              required
              defaultValue={organization.invoicePrefix}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
              name="logoUrl"
              type="url"
              placeholder="https://…"
              defaultValue={organization.logoUrl ?? ""}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-zinc-500">Address</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="addressLine1">Address line 1</Label>
            <Input
              id="addressLine1"
              name="addressLine1"
              defaultValue={organization.addressLine1 ?? ""}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="addressLine2">Address line 2</Label>
            <Input
              id="addressLine2"
              name="addressLine2"
              defaultValue={organization.addressLine2 ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" defaultValue={organization.city ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input id="state" name="state" defaultValue={organization.state ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postalCode">Postal code</Label>
            <Input
              id="postalCode"
              name="postalCode"
              defaultValue={organization.postalCode ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" defaultValue={organization.phone ?? ""} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={organization.email ?? ""}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-zinc-500">Payment details (PDF)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="upiId">UPI ID</Label>
            <Input id="upiId" name="upiId" defaultValue={organization.upiId ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank name</Label>
            <Input
              id="bankName"
              name="bankName"
              defaultValue={organization.bankName ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankIfsc">IFSC</Label>
            <Input
              id="bankIfsc"
              name="bankIfsc"
              defaultValue={organization.bankIfsc ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankAccountName">Account name</Label>
            <Input
              id="bankAccountName"
              name="bankAccountName"
              defaultValue={organization.bankAccountName ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankAccountNo">Account number</Label>
            <Input
              id="bankAccountNo"
              name="bankAccountNo"
              defaultValue={organization.bankAccountNo ?? ""}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="invoiceTerms">Invoice terms</Label>
            <Textarea
              id="invoiceTerms"
              name="invoiceTerms"
              rows={4}
              defaultValue={organization.invoiceTerms ?? ""}
            />
          </div>
        </div>
      </section>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
