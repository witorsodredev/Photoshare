import "server-only";
import { sendMail } from "@/lib/mailer";
import { issueToken } from "@/lib/tokens";
import { appBaseUrl } from "@/lib/util";

type Recipient = { id: string; email: string; name: string };

export async function sendVerificationEmail(req: Request, user: Recipient) {
  const token = await issueToken(user.id, "EMAIL_VERIFY");
  const link = `${appBaseUrl(req.url)}/verificar-email?token=${token}`;
  await sendMail(
    user.email,
    "Confirme seu e-mail — PhotoShare",
    `Olá, ${user.name}.\n\n` +
      `Para confirmar seu e-mail, abra o link abaixo (válido por 3 dias):\n\n${link}\n\n` +
      `Se você não criou uma conta, ignore esta mensagem.`,
  );
}

export async function resetPasswordLink(req: Request, userId: string) {
  const token = await issueToken(userId, "PASSWORD_RESET");
  return `${appBaseUrl(req.url)}/redefinir-senha?token=${token}`;
}

export async function sendPasswordResetEmail(req: Request, user: Recipient) {
  const link = await resetPasswordLink(req, user.id);
  await sendMail(
    user.email,
    "Redefinição de senha — PhotoShare",
    `Olá, ${user.name}.\n\n` +
      `Recebemos um pedido para redefinir sua senha. Abra o link abaixo ` +
      `(válido por 1 hora):\n\n${link}\n\n` +
      `Se não foi você, ignore esta mensagem — sua senha continua a mesma.`,
  );
}
