import { z } from "zod";

export const organizationFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  legalName: z.string().max(200).optional().or(z.literal("")),
  gstin: z.string().max(20).optional().or(z.literal("")),
  invoicePrefix: z
    .string()
    .min(1, "Invoice prefix is required")
    .max(10)
    .regex(/^[A-Z0-9-]+$/i, "Use letters, numbers, or hyphens"),
  logoUrl: z.string().url().optional().or(z.literal("")),
  addressLine1: z.string().max(200).optional().or(z.literal("")),
  addressLine2: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  state: z.string().max(100).optional().or(z.literal("")),
  postalCode: z.string().max(20).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  upiId: z.string().max(100).optional().or(z.literal("")),
  bankName: z.string().max(100).optional().or(z.literal("")),
  bankAccountName: z.string().max(100).optional().or(z.literal("")),
  bankAccountNo: z.string().max(50).optional().or(z.literal("")),
  bankIfsc: z.string().max(20).optional().or(z.literal("")),
  invoiceTerms: z.string().max(5000).optional().or(z.literal("")),
});

export type OrganizationFormInput = z.infer<typeof organizationFormSchema>;

export function formDataToOrganizationInput(formData: FormData): OrganizationFormInput {
  return organizationFormSchema.parse({
    name: formData.get("name"),
    legalName: formData.get("legalName") || "",
    gstin: formData.get("gstin") || "",
    invoicePrefix: formData.get("invoicePrefix"),
    logoUrl: formData.get("logoUrl") || "",
    addressLine1: formData.get("addressLine1") || "",
    addressLine2: formData.get("addressLine2") || "",
    city: formData.get("city") || "",
    state: formData.get("state") || "",
    postalCode: formData.get("postalCode") || "",
    phone: formData.get("phone") || "",
    email: formData.get("email") || "",
    upiId: formData.get("upiId") || "",
    bankName: formData.get("bankName") || "",
    bankAccountName: formData.get("bankAccountName") || "",
    bankAccountNo: formData.get("bankAccountNo") || "",
    bankIfsc: formData.get("bankIfsc") || "",
    invoiceTerms: formData.get("invoiceTerms") || "",
  });
}
