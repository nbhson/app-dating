import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AdminClient from "@/components/AdminClient";

export default async function AdminPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) redirect("/");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/");
  if (!user.isAdmin) redirect("/discover");
  return <AdminClient isAdmin={true} />;
}
