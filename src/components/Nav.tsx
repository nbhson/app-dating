"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { signOut } from "next-auth/react";
import { useI18n } from "@/lib/i18n/context";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Nav() {
  const pathname = usePathname();
  const { t, trans } = useI18n();
  const [isAdmin, setIsAdmin] = useState(false);
  const items = useMemo(() => {
    const base = [
      { href: "/discover", label: t.nav.discover, sub: t.nav.discoverSub, icon: "♥", activeIcon: "♥" },
      { href: "/matches", label: t.nav.inbox, sub: t.nav.inboxSub, icon: "✉", activeIcon: "✉" },
      { href: "/profile", label: t.nav.profile, sub: t.nav.profileSub, icon: "◐", activeIcon: "◉" },
    ];
    if (isAdmin) base.push({ href: "/admin", label: (t as any).nav?.admin ?? "Admin", sub: (t as any).nav?.adminSub ?? "Quản trị", icon: "⚙", activeIcon: "⚙" });
    return base;
  }, [t, isAdmin]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [unreadByMatch, setUnreadByMatch] = useState(0);

  useEffect(() => {
    fetch("/api/admin/stats").then(r=>{ if(r.ok) setIsAdmin(true); }).catch(()=>{});
    // fallback: check profile me for isAdmin (in case admin stats returns 401 but still admin via profile)
    fetch("/api/profile/me").then(r=>r.json()).then(d=>{ if(d.user?.isAdmin) setIsAdmin(true); }).catch(()=>{});
  }, []);

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
      {/* Desktop sidebar - glass romantic - locked to viewport */}
      <aside className="hidden md:flex md:flex-col md:w-[300px] shrink-0 h-[100dvh] overflow-hidden p-4 gap-4">
        <div className="flex-1 glass-strong rounded-[28px] p-6 flex flex-col gap-7 overflow-hidden relative">
          {/* aura */}
          <div className="aura aura-peach w-40 h-40 -top-10 -right-10 opacity-30" />
          <div className="aura aura-lavender w-32 h-32 bottom-20 -left-10 opacity-25" />

          <Link href="/discover" className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center text-white shadow-[0_6px_16px_rgba(255,77,109,0.3)] text-[16px]">♥</div>
            <div>
              <div className="font-display text-[18px] leading-none tracking-tight font-semibold">{t.common.appName}</div>
              <div className="text-[10px] font-mono tracking-[0.14em] uppercase text-[#8E6B75]">{t.common.tagline}</div>
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
                    <div className={`text-[11px] font-mono tracking-wide ${active ? "text-white/60" : "text-[#B08A95]"}`}>{isInbox && unreadByMatch > 0 ? trans("nav.newConversations", { count: unreadByMatch }) : i.sub}</div>
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
                <span className="text-xs font-semibold">{t.nav.cardsPerDay}</span>
              </div>
              <div className="text-[11.5px] text-[#8E6B75] leading-relaxed mt-2">{t.nav.cardsDesc}</div>
              <div className="mt-3 h-1.5 bg-[#FFF0F3] rounded-full overflow-hidden border border-[#FCE8EC]">
                <div className="h-full w-[65%] gradient-primary rounded-full" />
              </div>
              <div className="text-[10px] font-mono text-[#B08A95] mt-1.5">{trans("nav.todayProgress", { viewed: 13, limit: 20 })}</div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <LanguageSwitcher variant="pill" />
              <button onClick={() => signOut({ callbackUrl: "/" })} className="w-full h-10 rounded-full bg-white border border-[#FCE8EC] text-sm font-semibold text-[#2E1A22] hover:bg-[#FFF0F3] hover:border-[#FFD6DE] transition flex items-center justify-center gap-2 shadow-sm">
                <span className="text-[13px]">↪</span> {(t.profile as any).logout ?? "Đăng xuất"}
              </button>
              <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-[#B08A95]">
                <Link href="/privacy" className="hover:text-[#2E1A22] transition px-2 py-1 rounded-full hover:bg-white">{t.common.privacy}</Link>
                <span className="opacity-30">·</span>
                <Link href="/terms" className="hover:text-[#2E1A22] transition px-2 py-1 rounded-full hover:bg-white">{t.common.terms}</Link>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile bottom - floating pill glass */}
      <nav className="md:hidden fixed bottom-4 inset-x-4 z-50 flex flex-col items-center gap-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-1.5 p-1 rounded-full glass-strong shadow-[0_8px_20px_rgba(46,26,34,0.12)] border border-white/70">
          <LanguageSwitcher variant="compact" />
          <button onClick={() => signOut({ callbackUrl: "/" })} className="h-8 px-3.5 rounded-full bg-white border border-[#FCE8EC] text-xs font-semibold text-[#2E1A22] hover:bg-[#FFF0F3] flex items-center gap-1">
            ↪ {(t.profile as any).logout ?? "Đăng xuất"}
          </button>
        </div>
        <div className="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-full glass-strong shadow-[0_12px_32px_rgba(46,26,34,0.18),0_4px_12px_rgba(255,77,109,0.12)] border border-white/70">
          {items.map((i) => {
            const active = pathname.startsWith(i.href);
            const isInbox = i.href === "/matches";
            const showBadge = isInbox && unreadTotal > 0;
            return (
              <Link
                key={i.href}
                href={i.href}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold transition-all ${active ? "bg-[#2E1A22] text-white shadow-[0_4px_12px_rgba(46,26,34,0.2)]" : "text-[#8E6B75] hover:bg-white hover:text-[#2E1A22]"}`}
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
