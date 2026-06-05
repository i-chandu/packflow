import { z } from "zod";

export const customerFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  phone: z.string().max(30).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  addressLine1: z.string().max(200).optional().or(z.literal("")),
  addressLine2: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  billingState: z.string().max(100).optional().or(z.literal("")),
  postalCode: z.string().max(20).optional().or(z.literal("")),
  gstin: z.string().max(20).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  openingBalance: z.coerce.number().optional().default(0),
  isActive: z.enum(["true", "false"]).optional(),
});

export type CustomerFormInput = z.infer<typeof customerFormSchema>;

export function formDataToCustomerInput(formData: FormData): CustomerFormInput {
  return customerFormSchema.parse({
    name: formData.get("name"),
    phone: formData.get("phone") || "",
    email: formData.get("email") || "",
    addressLine1: formData.get("addressLine1") || "",
    addressLine2: formData.get("addressLine2") || "",
    city: formData.get("city") || "",
    billingState: formData.get("billingState") || "",
    postalCode: formData.get("postalCode") || "",
    gstin: formData.get("gstin") || "",
    notes: formData.get("notes") || "",
    openingBalance: formData.get("openingBalance") || 0,
    isActive: formData.get("isActive") || "true",
  });
}
