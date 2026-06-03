export function slugifyGymName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function uniqueSlug(base: string, suffix: string) {
  const root = slugifyGymName(base) || "gym";
  return `${root}-${suffix.slice(0, 8)}`;
}
