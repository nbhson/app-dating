import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ChatClient from "@/components/ChatClient";
import Nav from "@/components/Nav";

export default async function ChatPage({ params }: { params: Promise<{ matchId: string }> }) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) redirect("/");
  const { matchId } = await params;
  return (
    <div className="h-[100dvh] overflow-hidden flex">
      <div className="hidden md:flex h-[100dvh] overflow-hidden"><Nav /></div>
      <main className="flex-1 min-w-0 flex flex-col h-[100dvh] overflow-hidden">
        <ChatClient matchId={matchId} />
      </main>
    </div>
  );
}
