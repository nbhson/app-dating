import { auth } from "@/lib/auth";

/**
 * Round 2: unwrap session → userId một nơi duy nhất.
 * Trước đây `(session?.user as any)?.id` bị lặp ở ~35 route.
 */
export async function requireUserId(): Promise<string | null> {
  const session = await auth();
  const user = session?.user as { id?: string } | undefined;
  return user?.id ?? null;
}
