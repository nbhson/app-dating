import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProfileClient from "@/components/ProfileClient";
import Nav from "@/components/Nav";

export default async function ProfilePage() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) redirect("/");
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true, photos: { orderBy: { position: "asc" } }, preferences: true, promptAnswers: true } });
  if (!user) redirect("/");
  return (
    <div className="min-h-screen flex">
      <Nav />
      <main className="flex-1">
        <ProfileClient user={JSON.parse(JSON.stringify(user))} />
      </main>
    </div>
  );
}
