"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const items = [
  { href: "/discover", label: "Khám phá", sub: "Bưu thiếp", icon: "♥", activeIcon: "♥" },
  { href: "/matches", label: "Hòm thư", sub: "Trò chuyện", icon: "✉", activeIcon: "✉" },
  { href: "/profile", label: "Hồ sơ", sub: "Của bạn", icon: "◐", activeIcon: "◉" },
];

export default function Nav() {
  const pathname = usePathname();
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [unreadByMatch, setUnreadByMatch] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/matches");
        if (!r.ok) return;
        const d = await r.json();
        const total = (d.matches ?? []).reduce((s: number, m: any) => s + (m.unread || 0), 0);
        const countMatchesWithUnread = (d.matches ?? []).filter((m: any) => m.unread > 0).length;
        if (!cancelled) {
          setUnreadTotal(total);
          setUnreadByMatch(countMatchesWithUnread);
        }
      } catch {}
    }
    load();
    const id = setInterval(load, 15000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; clearInterval(id); window.removeEventListener("focus", onFocus); };
  }, [pathname]);
  return (
    <>
      {/* Desktop sidebar - glass romantic */}
      <aside className="hidden md:flex md:flex-col md:w-[300px] shrink-0 sticky top-0 h-screen p-4 gap-4">
        <div className="flex-1 glass-strong rounded-[28px] p-6 flex flex-col gap-7 overflow-hidden relative">
          {/* aura */}
          <div className="aura aura-peach w-40 h-40 -top-10 -right-10 opacity-30" />
          <div className="aura aura-lavender w-32 h-32 bottom-20 -left-10 opacity-25" />

          <Link href="/discover" className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center text-white shadow-[0_6px_16px_rgba(255,77,109,0.3)] text-[16px]">♥</div>
            <div>
              <div className="font-display text-[18px] leading-none tracking-tight font-semibold">Lumen</div>
              <div className="text-[10px] font-mono tracking-[0.14em] uppercase text-[#8E6B75]">Letters, not swipes</div>
            </div>
            <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse-soft" />
          </Link>

          <nav className="flex flex-col gap-2 relative z-10">
            {items.map((i) => {
              const active = pathname.startsWith(i.href);
              const isInbox = i.href === "/matches";
              const showBadge = isInbox && unreadTotal > 0;
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  className={`group px-4 py-3.5 rounded-[20px] flex items-center gap-3.5 transition-all border relative ${active ? "bg-[#2E1A22] text-white border-[#2E1A22] shadow-[0_8px_20px_rgba(46,26,34,0.18)]" : "bg-white/70 border-white/60 hover:bg-white hover:border-[#FFD6DE] hover:shadow-[0_4px_16px_rgba(46,26,34,0.06)] text-[#2E1A22]"}`}
                >
                  <span className={`w-9 h-9 rounded-full grid place-items-center text-[13px] transition shrink-0 relative ${active ? "bg-white/15 text-white" : "bg-[#FFF0F3] text-[#FF4D6D] border border-[#FCE8EC] group-hover:bg-[#FF4D6D] group-hover:text-white"}`}>
                    {i.icon}
                    {showBadge && !active && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full gradient-primary text-white text-[9px] font-bold grid place-items-center border-2 border-white shadow-sm">
                        {unreadTotal > 99 ? "99+" : unreadTotal}
                      </span>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold leading-none flex items-center gap-2">
                      {i.label}
                      {showBadge && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${active ? "bg-[#FF4D6D] text-white" : "gradient-primary text-white shadow-sm"}`}>
                          {unreadTotal > 99 ? "99+" : unreadTotal}
                        </span>
                      )}
                    </div>
                    <div className={`text-[11px] font-mono tracking-wide ${active ? "text-white/60" : "text-[#B08A95]"}`}>{isInbox && unreadByMatch > 0 ? `${unreadByMatch} cuộc trò chuyện mới` : i.sub}</div>
                  </div>
                  {active && !showBadge && <span className="w-2 h-2 rounded-full bg-[#FF8FA3] animate-pulse-soft" />}
                  {showBadge && active && <span className="w-2 h-2 rounded-full bg-[#FF4D6D] animate-pulse shadow-[0_0_8px_rgba(255,77,109,0.6)]" />}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-3 relative z-10">
            <div className="rounded-[20px] bg-gradient-to-br from-[#FFF0F3] via-white to-[#FFF7F5] border border-[#FCE8EC] p-4 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-[#FF8FA3]/10 blur-xl" />
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full gradient-primary grid place-items-center text-white text-xs">✦</span>
                <span className="text-xs font-semibold">20 bưu thiếp / ngày</span>
              </div>
              <div className="text-[11.5px] text-[#8E6B75] leading-relaxed mt-2">Đọc chậm. Mỗi lượt thích cần một dòng thật lòng — để trân trọng nhau hơn.</div>
              <div className="mt-3 h-1.5 bg-[#FFF0F3] rounded-full overflow-hidden border border-[#FCE8EC]">
                <div className="h-full w-[65%] gradient-primary rounded-full" />
              </div>
              <div className="text-[10px] font-mono text-[#B08A95] mt-1.5">13 / 20 hôm nay</div>
            </div>
            <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-[#B08A95]">
              <Link href="/privacy" className="hover:text-[#2E1A22] transition px-2 py-1 rounded-full hover:bg-white">Privacy</Link>
              <span className="opacity-30">·</span>
              <Link href="/terms" className="hover:text-[#2E1A22] transition px-2 py-1 rounded-full hover:bg-white">Terms</Link>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile bottom - floating pill glass */}
      <nav className="md:hidden fixed bottom-4 inset-x-4 z-50 flex justify-center pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-full glass-strong shadow-[0_12px_32px_rgba(46,26,34,0.18),0_4px_12px_rgba(255,77,109,0.12)] border border-white/70">
          {items.map((i) => {
            const active = pathname.startsWith(i.href);
            const isInbox = i.href === "/matches";
            const showBadge = isInbox && unreadTotal > 0;
            return (
              <Link
                key={i.href}
                href={i.href}
                className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold transition-all ${active ? "bg-[#2E1A22] text-white shadow-[0_4px_12px_rgba(46,26,34,0.2)]" : "text-[#8E6B75] hover:bg-white hover:text-[#2E1A22]"}`}
              >
                <span className="text-[13px] leading-none relative">
                  {i.icon}
                  {showBadge && (
                    <span className="absolute -top-2 -right-2 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#FF4D6D] text-white text-[8px] font-bold grid place-items-center border border-white">
                      {unreadTotal > 9 ? "9+" : unreadTotal}
                    </span>
                  )}
                </span>
                <span className="tracking-wide flex items-center gap-1">
                  {i.label}
                  {showBadge && <span className={`ml-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold grid place-items-center ${active ? "bg-[#FF4D6D] text-white" : "gradient-primary text-white"}`}>{unreadTotal > 99 ? "99+" : unreadTotal}</span>}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
