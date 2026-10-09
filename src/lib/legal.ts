// Operator identification shown in the footer and legal pages
// (Decreto 7.962/2013, LGPD art. 9 and art. 41). Filled from env so the
// same build can be deployed by whoever runs it.

/** Bump when Terms/Privacy text changes materially; stored on acceptance. */
export const TERMS_VERSION = "2026-10-09";

export type LegalInfo = {
  name: string;
  document: string | null; // CNPJ or CPF
  address: string | null;
  contactEmail: string | null;
  privacyEmail: string | null; // canal do encarregado (LGPD art. 41)
  abuseEmail: string | null;
  city: string | null; // foro
};

export function legalInfo(): LegalInfo {
  const env = (k: string) => process.env[k]?.trim() || null;
  const contact = env("LEGAL_CONTACT_EMAIL");
  return {
    name: env("LEGAL_NAME") || "PhotoShare",
    document: env("LEGAL_DOCUMENT"),
    address: env("LEGAL_ADDRESS"),
    contactEmail: contact,
    privacyEmail: env("LEGAL_PRIVACY_EMAIL") || contact,
    abuseEmail: env("LEGAL_ABUSE_EMAIL") || contact,
    city: env("LEGAL_CITY"),
  };
}
