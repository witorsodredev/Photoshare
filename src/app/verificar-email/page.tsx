import { notFound } from "next/navigation";
import { VerifyEmailForm } from "@/components/AccountRecovery";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) notFound();
  return (
    <main className="flex min-h-screen items-center px-6 py-16">
      <VerifyEmailForm token={token} />
    </main>
  );
}
