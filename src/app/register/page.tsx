import { Suspense } from "react";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { getSessionUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (await getSessionUserId()) redirect("/workspace");
  return (
    <main className="flex min-h-screen items-center px-6 py-16">
      <Suspense>
        <AuthForm mode="register" />
      </Suspense>
    </main>
  );
}
