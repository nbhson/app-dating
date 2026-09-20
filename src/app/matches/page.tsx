import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MatchesClient from "@/components/MatchesClient";
import Nav from "@/components/Nav";

export default async function MatchesPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) redirect("/");
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
  if (!user?.profile) redirect("/onboarding");
  return (
    <div className="min-h-screen flex">
      <Nav />
      <main className="flex-1">
        <MatchesClient />
      </main>
    </div>
  );
}
