export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  digits = digits.replace(/^0+/, "");
  if (digits.startsWith("98") && digits.length > 10) return `+${digits}`;
  return `+98${digits}`;
}

export function displayPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("98") && digits.length > 10) return `0${digits.slice(2)}`;
  return phone;
}
