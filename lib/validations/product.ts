import { z } from "zod";

export const productFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  lengthMm: z.coerce.number().positive("Length must be positive"),
  widthMm: z.coerce.number().positive("Width must be positive"),
  heightMm: z.coerce.number().positive("Height must be positive"),
  ply: z.string().max(20).optional().or(z.literal("")),
  gsm: z.coerce.number().nonnegative().optional().or(z.literal("")),
  supplierId: z.string().uuid().optional().or(z.literal("")),
  purchaseRate: z.coerce.number().nonnegative("Purchase rate must be ≥ 0"),
  sellingRate: z.coerce.number().nonnegative("Selling rate must be ≥ 0"),
  notes: z.string().max(2000).optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type ProductFormInput = z.infer<typeof productFormSchema>;

export function formDataToProductInput(formData: FormData): ProductFormInput {
  return productFormSchema.parse({
    name: formData.get("name"),
    lengthMm: formData.get("lengthMm"),
    widthMm: formData.get("widthMm"),
    heightMm: formData.get("heightMm"),
    ply: formData.get("ply") || "",
    gsm: formData.get("gsm") || "",
    supplierId: formData.get("supplierId") || "",
    purchaseRate: formData.get("purchaseRate"),
    sellingRate: formData.get("sellingRate"),
    notes: formData.get("notes") || "",
    status: formData.get("status") || "active",
  });
}
