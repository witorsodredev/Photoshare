import { Suspense } from "react";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { getSessionUserId } from "@/lib/auth";
import { captchaSiteKey } from "@/lib/captcha";
import { mailEnabled } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSessionUserId()) redirect("/workspace");
  return (
    <main className="flex min-h-screen items-center px-6 py-16">
      <Suspense>
        <AuthForm
          mode="login"
          captchaSiteKey={captchaSiteKey()}
          mailEnabled={mailEnabled()}
        />
      </Suspense>
    </main>
  );
}
