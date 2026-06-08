const ERROR_MAP: Record<string, string> = {
  "At least 2 characters": "validationMinLength",
  "Enter a valid phone number": "validationPhone",
  "Phone numbers only": "validationPhoneFormat",
  "National code must be exactly 10 digits": "validationNationalCode",
  "Join date is required": "validationJoinDate",
  "A membership plan is required": "validationPlanRequired",
};

export function translateFieldErrors<T extends string>(
  fieldErrors: Record<string, string[]>,
  t: (key: T) => string,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [field, msgs] of Object.entries(fieldErrors)) {
    result[field] = msgs.map((msg) => {
      const key = ERROR_MAP[msg];
      return key ? t(key as T) : msg;
    });
  }
  return result;
}
