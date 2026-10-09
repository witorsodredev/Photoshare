import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

// Outgoing e-mail over SMTP. Optional: without SMTP_HOST the app works, but
// e-mail confirmation is skipped and password resets go through the admin.

let transport: Transporter | null = null;

export function mailEnabled(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

function getTransport(): Transporter {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT || 587);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    });
  }
  return transport;
}

export async function sendMail(to: string, subject: string, text: string) {
  await getTransport().sendMail({ from: process.env.SMTP_FROM, to, subject, text });
}
