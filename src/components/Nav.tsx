"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/discover", label: "Bưu thiếp", sub: "Khám phá" },
  { href: "/matches", label: "Thư", sub: "Trò chuyện" },
  { href: "/profile", label: "Hồ sơ", sub: "Của bạn" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <>
      {/* Desktop sidebar - editorial */}
      <aside className="hidden md:flex md:flex-col md:w-[280px] border-r border-[#E8DDD3] bg-[#FFFCF8]/80 backdrop-blur p-6 gap-8 sticky top-0 h-screen">
        <Link href="/discover" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#1A1A1E] flex items-center justify-center text-white font-mono text-[11px]">Lm</div>
          <div>
            <div className="font-display text-[18px] leading-none tracking-tight">Lumen</div>
            <div className="text-[10px] font-mono tracking-[0.14em] uppercase text-[#6B6B6B]">Letters, not swipes</div>
          </div>
        </Link>
        <nav className="flex flex-col gap-1.5">
          {items.map((i) => {
            const active = pathname.startsWith(i.href);
            return (
              <Link
                key={i.href}
                href={i.href}
                className={`px-4 py-3 rounded-2xl flex items-center justify-between transition border ${active ? "bg-[#1A1A1E] text-white border-[#1A1A1E]" : "bg-white border-[#E8DDD3] hover:border-[#C96442]/30 text-[#1A1A1E]"}`}
              >
                <span className="text-sm font-medium">{i.label}</span>
                <span className={`text-[10px] font-mono tracking-widest uppercase ${active ? "text-white/60" : "text-[#9A9A9A]"}`}>{i.sub}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-3">
          <div className="rounded-2xl bg-[#F2EDE8] border border-[#E8DDD3] p-4">
            <div className="text-xs font-medium">20 bưu thiếp / ngày</div>
            <div className="text-[11px] text-[#6B6B6B] leading-relaxed mt-1">Đọc chậm. Mỗi lượt thích cần một dòng thật lòng.</div>
          </div>
          <div className="text-[11px] font-mono text-[#9A9A9A] flex gap-2">
            <Link href="/privacy" className="hover:underline">Privacy</Link> · <Link href="/terms" className="hover:underline">Terms</Link>
          </div>
        </div>
      </aside>
      {/* Mobile bottom - pill */}
      <nav className="md:hidden fixed bottom-3 inset-x-3 bg-[#1A1A1E] rounded-full flex justify-around p-1.5 z-50 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
        {items.map((i) => {
          const active = pathname.startsWith(i.href);
          return (
            <Link
              key={i.href}
              href={i.href}
              className={`flex-1 flex flex-col items-center gap-0.5 px-3 py-2 rounded-full text-xs font-medium transition ${active ? "bg-white text-[#1A1A1E]" : "text-white/70"}`}
            >
              <span className="text-[11px] font-mono tracking-widest uppercase leading-none">{i.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
