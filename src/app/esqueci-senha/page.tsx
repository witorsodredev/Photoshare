import { ForgotPasswordForm } from "@/components/AccountRecovery";
import { captchaSiteKey } from "@/lib/captcha";
import { mailEnabled } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center px-6 py-16">
      <ForgotPasswordForm captchaSiteKey={captchaSiteKey()} mailEnabled={mailEnabled()} />
    </main>
  );
}
