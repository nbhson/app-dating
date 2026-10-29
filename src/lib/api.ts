import { auth } from "@/lib/auth";

/**
 * Round 2: unwrap session → userId một nơi duy nhất.
 * Trước đây `(session?.user as any)?.id` bị lặp ở ~35 route.
 */
export async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return ((session?.user as any)?.id as string | undefined) ?? null;
}
