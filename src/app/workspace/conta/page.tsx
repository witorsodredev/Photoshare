import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AccountSettings from "@/components/AccountSettings";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">Minha conta</h1>
      <p className="mt-1 text-sm text-gray-400">
        {user.name} · {user.email}
      </p>
      <AccountSettings />
    </div>
  );
}
