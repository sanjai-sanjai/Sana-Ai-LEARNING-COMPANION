import {
  parsePhoneNumberFromString,
  getCountries,
  getCountryCallingCode,
  AsYouType,
  type CountryCode,
} from "libphonenumber-js";

export type { CountryCode };

export type PhoneValidation =
  | { ok: true; e164: string; national: string; country: CountryCode }
  | { ok: false; reason: string };

/** Parse a user-entered phone number and coerce to E.164. */
export function validatePhone(input: string, defaultCountry?: CountryCode): PhoneValidation {
  const raw = (input ?? "").trim();
  if (!raw) return { ok: false, reason: "Enter a phone number" };
  try {
    const parsed = parsePhoneNumberFromString(raw, defaultCountry);
    if (!parsed) return { ok: false, reason: "Could not parse this number" };
    if (!parsed.isValid()) return { ok: false, reason: "This number is not valid" };
    const type = parsed.getType();
    if (type && !["MOBILE", "FIXED_LINE_OR_MOBILE", "PERSONAL_NUMBER", "VOIP"].includes(type)) {
      return { ok: false, reason: "Use a mobile or reachable number" };
    }
    return {
      ok: true,
      e164: parsed.number,
      national: parsed.formatNational(),
      country: parsed.country ?? (defaultCountry as CountryCode),
    };
  } catch {
    return { ok: false, reason: "Could not parse this number" };
  }
}

/** Live-format as the user types for a given country. */
export function formatAsYouType(input: string, country: CountryCode): string {
  return new AsYouType(country).input(input);
}

/** Sorted country list with dial codes for the picker. */
export function listCountries(): Array<{ code: CountryCode; dial: string; name: string }> {
  const namer = new Intl.DisplayNames(["en"], { type: "region" });
  return getCountries()
    .map((code) => ({
      code,
      dial: "+" + getCountryCallingCode(code),
      name: namer.of(code) ?? code,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Best-effort browser country guess from Intl locale. */
export function guessCountry(): CountryCode {
  try {
    const locale = new Intl.Locale(navigator.language);
    const region = (locale as unknown as { region?: string }).region;
    if (region && region.length === 2) return region as CountryCode;
  } catch {
    /* noop */
  }
  return "US";
}
