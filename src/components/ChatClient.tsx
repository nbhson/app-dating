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

  if (loading) return <div className="p-8 text-sm font-mono text-[#8E6B75] animate-pulse">Đang mở thư… ✨</div>;

  return (
    <div className="flex-1 flex flex-col max-w-2xl w-full mx-auto glass-strong md:rounded-[28px] overflow-hidden md:my-4 md:border border-white/60 shadow-[0_12px_40px_rgba(46,26,34,0.08)] min-h-screen md:min-h-[700px]">
      <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-[#FCE8EC] px-4 py-3.5 flex items-center gap-3">
        <Link href="/matches" className="w-9 h-9 rounded-full bg-white border border-[#FCE8EC] grid place-items-center hover:bg-[#FFF0F3] transition shadow-sm">
          ‹
        </Link>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFE8EC] to-[#F3EFFF] border border-white overflow-hidden shadow-sm">
          {other?.photo ? <img src={other.photo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-[#FF8FA3]">♥</div>}
        </div>
        <div>
          <div className="font-semibold text-sm leading-none flex items-center gap-1.5">{other?.name ?? "Thư"} <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /></div>
          <div className="text-[11px] font-medium text-[#8E6B75] flex items-center gap-1.5">
            {slowInfo ? (
              <>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${slowInfo.remaining <= 1 ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-[#FFF0F3] border-[#FCE8EC] text-[#FF4D6D]"}`}>
                  {slowInfo.remaining} tin nhắn còn lại hôm nay
                </span>
                <span className="hidden sm:inline text-[#B08A95]">· chậm mà sâu</span>
              </>
            ) : "Kết nối bưu thiếp 💌"}
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={async () => {
              if (!other) return;
              if (!confirm(`Chặn ${other.name}?`)) return;
              await fetch(`/api/users/${other.id}/block`, { method: "POST" });
              window.location.href = "/matches";
            }}
            className="text-xs font-medium border border-[#FCE8EC] rounded-full px-3.5 py-1.5 bg-white hover:bg-[#FFF0F3] transition"
          >
            Chặn
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-[#FFFCFA]/50 to-[#FFF7F5]/50">
        {starter && (
          <div className="rounded-[20px] bg-[#2E1A22] text-white p-5 relative overflow-hidden shadow-[0_8px_24px_rgba(46,26,34,0.14)]">
            <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-[#FF4D6D]/15 blur-xl" />
            <div className="text-[10px] font-mono tracking-[0.16em] uppercase text-[#FF8FA3] font-semibold">Mở lời từ bưu thiếp</div>
            <div className="font-display text-[15px] mt-2 leading-snug italic">“{starter}”</div>
          </div>
        )}
        {messages.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full gradient-primary text-white grid place-items-center mx-auto text-xl shadow-[0_8px_20px_rgba(255,77,109,0.3)]">✉</div>
            <p className="text-sm font-display font-medium mt-4">Hãy viết dòng đầu tiên</p>
            <p className="text-xs text-[#8E6B75] mt-1.5 bg-white/70 border border-[#FCE8EC] inline-block px-3 py-1.5 rounded-full">Gợi ý: nhắc lại điều bạn đã chọn trong bưu thiếp của họ.</p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-[20px] px-4 py-3 text-sm leading-relaxed shadow-sm ${m.isMine ? "bg-[#2E1A22] text-white rounded-br-[6px] shadow-[0_4px_16px_rgba(46,26,34,0.18)]" : "bg-white border border-[#FCE8EC] rounded-bl-[6px] text-[#2E1A22]"}`}>
                <div className={m.content.startsWith("“") ? "font-display italic" : ""}>{m.content}</div>
                <div className={`text-[10px] font-mono mt-1.5 flex items-center gap-1 ${m.isMine ? "text-white/60 justify-end" : "text-[#B08A95]"}`}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {m.isMine && <span className="text-[10px]">✓✓</span>}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="border-t border-[#FCE8EC] bg-white/80 backdrop-blur-xl p-3 flex gap-2 sticky bottom-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={slowInfo && slowInfo.remaining <= 0 ? "Đã hết lượt hôm nay... mai nhé 🌙" : "Viết một dòng chậm..."}
          disabled={!!(slowInfo && slowInfo.remaining <= 0)}
          className="flex-1 h-12 rounded-full border border-[#FCE8EC] bg-[#FFFCFA] px-5 text-sm outline-none focus:bg-white focus:border-[#FF8FA3] focus:shadow-[0_4px_16px_rgba(255,77,109,0.08)] disabled:opacity-50 transition placeholder:text-[#B08A95]"
        />
        <button type="submit" disabled={!!(slowInfo && slowInfo.remaining <= 0)} className="w-12 h-12 rounded-full btn-primary grid place-items-center shrink-0 disabled:opacity-40 text-lg">
          ↑
        </button>
      </form>
      <div className="text-center text-[10px] font-mono text-[#B08A95] pb-4 pt-2.5 px-4 bg-white/50">Lumen chậm: 5 tin/ngày cho 48h đầu — để mỗi tin có trọng lượng. ✨</div>
    </div>
  );
}
