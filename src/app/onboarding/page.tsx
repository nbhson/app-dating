import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import OnboardingClient from "@/components/OnboardingClient";

export default async function OnboardingPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) redirect("/");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true, photos: true, preferences: true, promptAnswers: true },
  });
  // if already complete, go to discover
  if (user?.profile && user.photos.length > 0) {
    // check if preferences exist
    if (user.preferences) {
      // optionally still allow editing but redirect for now if all done and photos >0
      // let user stay? We'll allow redirect if they already completed.
      // Comment out to allow re-entry: redirect("/discover");
    }
  }
  return <OnboardingClient initial={{ profile: user?.profile, photos: user?.photos ?? [], preferences: user?.preferences, promptAnswers: (user as any)?.promptAnswers ?? [] }} />;
}
