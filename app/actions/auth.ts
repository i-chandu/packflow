"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { findUniqueOrgSlug, isValidOrgSlug } from "@/lib/slug";

const signupSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  businessName: z.string().min(2).max(120),
  slug: z.string().optional(),
});

export type SignupState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  slug?: string;
};

export async function registerOrganization(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    businessName: formData.get("businessName"),
    slug: formData.get("slug") || undefined,
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const email = parsed.data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  let slug = parsed.data.slug?.trim().toLowerCase();
  if (slug) {
    if (!isValidOrgSlug(slug)) {
      return { fieldErrors: { slug: ["Invalid workspace URL."] } };
    }
    const slugTaken = await prisma.organization.findUnique({ where: { slug } });
    if (slugTaken) {
      return { fieldErrors: { slug: ["This workspace URL is already taken."] } };
    }
  } else {
    slug = await findUniqueOrgSlug(parsed.data.businessName, async (s) => {
      const row = await prisma.organization.findUnique({ where: { slug: s } });
      return row !== null;
    });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const organization = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        name: parsed.data.name,
        passwordHash,
        emailVerified: new Date(),
      },
    });

    const org = await tx.organization.create({
      data: {
        name: parsed.data.businessName,
        slug,
      },
    });

    await tx.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: "owner",
      },
    });

    return org;
  });

  return { success: true, slug: organization.slug };
}
