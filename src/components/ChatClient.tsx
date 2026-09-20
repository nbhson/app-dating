"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function ChatClient({ matchId }: { matchId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [other, setOther] = useState<any>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [slowInfo, setSlowInfo] = useState<{ remaining: number; resetAt?: string } | null>(null);
  const [starter, setStarter] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch(`/api/matches/${matchId}/messages`);
    const data = await res.json();
    if (res.ok) {
      setMessages(data.messages);
      setOther(data.other);
      if (data.slow) setSlowInfo(data.slow);
      if (data.starter) setStarter(data.starter);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    if (slowInfo && slowInfo.remaining <= 0) {
      alert("Bạn đã dùng hết 5 tin nhắn cho hôm nay với kết nối mới. Quay lại ngày mai để trò chuyện chậm hơn.");
      return;
    }
    const content = input;
    setInput("");
    setMessages((m) => [...m, { id: Date.now().toString(), content, isMine: true, createdAt: new Date().toISOString() }]);
    const res = await fetch(`/api/matches/${matchId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      const d = await res.json();
      if (d.error === "SLOW_LIMIT") alert("Đã hết lượt nhắn hôm nay (5/ngày cho 48h đầu). Hãy để câu chuyện ngấm.");
      load();
    } else load();
  }

  if (loading) return <div className="p-8 text-sm font-mono text-[#6B6B6B]">Đang mở thư...</div>;

  return (
    <div className="flex-1 flex flex-col max-w-2xl w-full mx-auto md:border-x border-[#E8DDD3] bg-[#FFFCF8] min-h-screen">
      <div className="sticky top-0 bg-[#FFFCF8]/90 backdrop-blur border-b border-[#E8DDD3] px-4 py-3 flex items-center gap-3">
        <Link href="/matches" className="w-8 h-8 rounded-full border border-[#E8DDD3] bg-white grid place-items-center">
          ‹
        </Link>
        <div className="w-9 h-9 rounded-full bg-[#F2EDE8] border border-[#E8DDD3] overflow-hidden">
          {other?.photo ? <img src={other.photo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-[#9A9A9A]">○</div>}
        </div>
        <div>
          <div className="font-medium text-sm leading-none">{other?.name ?? "Thư"}</div>
          <div className="text-[11px] font-mono text-[#9A9A9A]">{slowInfo ? `${slowInfo.remaining} tin nhắn còn lại hôm nay` : "Kết nối bưu thiếp"}</div>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={async () => {
              if (!other) return;
              if (!confirm(`Chặn ${other.name}?`)) return;
              await fetch(`/api/users/${other.id}/block`, { method: "POST" });
              window.location.href = "/matches";
            }}
            className="text-xs border border-[#E8DDD3] rounded-full px-3 py-1.5 bg-white"
          >
            Chặn
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FDF8F4]">
        {starter && (
          <div className="rounded-2xl border border-[#E8DDD3] bg-[#1A1A1E] text-[#FDF8F4] p-4">
            <div className="text-[10px] font-mono tracking-widest uppercase opacity-60">Mở lời từ bưu thiếp</div>
            <div className="font-display text-sm mt-1">“{starter}”</div>
          </div>
        )}
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-[#C96442] text-white grid place-items-center mx-auto text-lg">✉</div>
            <p className="text-sm font-display mt-3">Hãy viết dòng đầu tiên</p>
            <p className="text-xs text-[#6B6B6B] mt-1">Gợi ý: nhắc lại điều bạn đã chọn trong bưu thiếp của họ.</p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.isMine ? "bg-[#1A1A1E] text-white rounded-br-sm" : "bg-white border border-[#E8DDD3] rounded-bl-sm"}`}>
                <div className={m.content.startsWith("“") ? "font-display italic" : ""}>{m.content}</div>
                <div className={`text-[10px] font-mono mt-1 ${m.isMine ? "text-white/60" : "text-[#9A9A9A]"}`}>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="border-t border-[#E8DDD3] bg-[#FFFCF8] p-3 flex gap-2 sticky bottom-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={slowInfo && slowInfo.remaining <= 0 ? "Đã hết lượt hôm nay..." : "Viết một dòng chậm..."}
          disabled={!!(slowInfo && slowInfo.remaining <= 0)}
          className="flex-1 h-11 rounded-full border border-[#E8DDD3] bg-[#FDF8F4] px-4 text-sm outline-none focus:bg-white focus:border-[#C96442] disabled:opacity-50"
        />
        <button type="submit" disabled={!!(slowInfo && slowInfo.remaining <= 0)} className="w-11 h-11 rounded-full bg-[#C96442] text-white grid place-items-center shrink-0 disabled:opacity-40">
          ↑
        </button>
      </form>
      <div className="text-center text-[10px] font-mono text-[#9A9A9A] pb-4 pt-2 px-4">Lumen chậm: 5 tin/ngày cho 48h đầu — để mỗi tin có trọng lượng.</div>
    </div>
  );
}
