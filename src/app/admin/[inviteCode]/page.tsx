import { redirect } from "next/navigation";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  const { inviteCode } = await params;
  redirect(`/admin/${inviteCode}/invitaciones`);
}
