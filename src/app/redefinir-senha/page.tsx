import { notFound } from "next/navigation";
import { ResetPasswordForm } from "@/components/AccountRecovery";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) notFound();
  return (
    <main className="flex min-h-screen items-center px-6 py-16">
      <ResetPasswordForm token={token} />
    </main>
  );
}
