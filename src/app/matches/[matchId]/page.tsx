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
    <div className="min-h-screen flex">
      <div className="hidden md:flex"><Nav /></div>
      <main className="flex-1 flex flex-col">
        <ChatClient matchId={matchId} />
      </main>
    </div>
  );
}
