import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import LandingClient from "@/components/LandingClient";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!user?.profile) redirect("/onboarding");
    else redirect("/discover");
  }
  return <LandingClient />;
}
