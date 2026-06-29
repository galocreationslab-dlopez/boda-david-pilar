/**
 * app/admin/[inviteCode]/layout.tsx
 * Layout del panel de administración — valida acceso admin.
 */

import { notFound } from "next/navigation";
import { validateAdminCode } from "@/lib/admin-auth";
import AdminNav from "@/components/admin/AdminNav";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ inviteCode: string }>;
}) {
  const { inviteCode } = await params;
  const isAdmin = await validateAdminCode(inviteCode);
  if (!isAdmin) notFound();

  return (
    <div className="min-h-screen bg-stone-50">
      <AdminNav inviteCode={inviteCode} />
      <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>
    </div>
  );
}
