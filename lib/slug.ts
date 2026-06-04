import { RESERVED_SLUGS } from "@/lib/constants";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function isValidOrgSlug(slug: string): boolean {
  if (slug.length < 2 || slug.length > 48) return false;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return false;
  if (RESERVED_SLUGS.has(slug)) return false;
  return true;
}

export async function findUniqueOrgSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  let slug = slugify(base) || "org";
  if (!isValidOrgSlug(slug)) slug = "org";

  if (!(await exists(slug))) return slug;

  for (let i = 2; i < 100; i++) {
    const candidate = `${slug}-${i}`;
    if (isValidOrgSlug(candidate) && !(await exists(candidate))) {
      return candidate;
    }
  }

  return `${slug}-${Date.now()}`;
}
