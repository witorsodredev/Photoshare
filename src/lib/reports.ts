// Client-safe: also used by the report form.
export const REPORT_REASONS = {
  INTIMATE: "Nudez ou conteúdo íntimo sem consentimento",
  MINOR: "Envolve criança ou adolescente de forma inadequada",
  MY_IMAGE: "Uso da minha imagem sem autorização",
  COPYRIGHT: "Violação de direitos autorais",
  VIOLENCE: "Violência, ódio ou conteúdo ilegal",
  OTHER: "Outro motivo",
} as const;

export type ReportReason = keyof typeof REPORT_REASONS;
