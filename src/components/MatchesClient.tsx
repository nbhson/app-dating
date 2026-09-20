"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function MatchesClient() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "new" | "chatting">("all");
  useEffect(() => {
    fetch("/api/matches")
      .then((r) => r.json())
      .then((d) => {
        setMatches(d.matches ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-sm font-mono text-[#6B6B6B]">Đang mở hòm thư...</div>;

  const filtered = matches.filter((m) => {
    if (tab === "new") return !m.lastMessage || m.lastMessage.startsWith("“");
    if (tab === "chatting") return m.lastMessage && !m.lastMessage.startsWith("“");
    return true;
  });

  return (
    <div className="max-w-2xl mx-auto w-full min-h-screen bg-[#FFFCF8] md:border-x border-[#E8DDD3]">
      <div className="sticky top-0 bg-[#FFFCF8]/90 backdrop-blur border-b border-[#E8DDD3] px-4 py-3 flex items-center justify-between">
        <h1 className="font-display text-lg">Hòm thư</h1>
        <Link href="/discover" className="text-xs font-mono tracking-widest uppercase text-[#C96442] border border-[#E8DDD3] rounded-full px-3 py-1.5 bg-white">
          Bưu thiếp →
        </Link>
      </div>

      <div className="px-4 py-3 flex gap-2 border-b border-[#E8DDD3] bg-[#FDF8F4]">
        {[
          ["all", "Tất cả"],
          ["new", "Mới"],
          ["chatting", "Đang trò chuyện"],
        ].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v as any)} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${tab === v ? "bg-[#1A1A1E] text-white border-[#1A1A1E]" : "bg-white border-[#E8DDD3] text-[#6B6B6B]"}`}>
            {l}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-[#F2EDE8] border border-[#E8DDD3] grid place-items-center mx-auto text-xl">✉</div>
          <h3 className="font-display text-lg">Chưa có thư nào</h3>
          <p className="text-sm text-[#6B6B6B]">Khi ai đó gửi bưu thiếp kèm lời nhắn và bạn cũng chọn họ, thư sẽ xuất hiện ở đây.</p>
          <Link href="/discover" className="inline-flex h-11 px-6 rounded-full bg-[#C96442] text-white items-center font-medium text-sm">
            Mở bưu thiếp
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-[#E8DDD3]">
          {filtered.map((m) => (
            <Link key={m.id} href={`/matches/${m.id}`} className="flex items-center gap-3 p-4 hover:bg-[#FDF8F4] transition">
              <div className="w-12 h-12 rounded-full bg-[#F2EDE8] border border-[#E8DDD3] overflow-hidden flex-shrink-0">
                {m.other.photo ? <img src={m.other.photo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-[#9A9A9A]">○</div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{m.other.name}</span>
                  {m.other.intent && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#F2EDE8] border border-[#E8DDD3]">{m.other.intent}</span>}
                  {m.unread > 0 && <span className="w-5 h-5 rounded-full bg-[#C96442] text-white text-[10px] grid place-items-center">{m.unread}</span>}
                </div>
                <div className="text-xs text-[#6B6B6B] truncate font-display italic">{m.lastMessage ?? "Bưu thiếp mở lời — hãy trả lời"}</div>
              </div>
              <div className="text-[11px] font-mono text-[#9A9A9A]">{new Date(m.lastMessageAt).toLocaleDateString("vi-VN")}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
