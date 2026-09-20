"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";

export default function MatchesClient() {
  const { t, trans, locale } = useI18n();
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

  if (loading) return <div className="p-8 text-sm font-mono text-[#8E6B75] animate-pulse">{t.matches.loading}</div>;

  const filtered = matches.filter((m) => {
    if (tab === "new") return !m.lastMessage || m.lastMessage.startsWith("“");
    if (tab === "chatting") return m.lastMessage && !m.lastMessage.startsWith("“");
    return true;
  });

  return (
    <div className="max-w-2xl mx-auto w-full h-full max-h-[calc(100dvh-88px)] md:max-h-[calc(100dvh-1rem)] glass-strong md:rounded-[28px] overflow-hidden md:my-2 border border-white/60 shadow-[0_12px_40px_rgba(46,26,34,0.08)] flex flex-col">
      <div className="shrink-0 bg-white/80 backdrop-blur-xl border-b border-[#FCE8EC] px-5 py-4 flex items-center justify-between">
        <h1 className="font-display text-[22px] font-medium flex items-center gap-2">{t.matches.title} <span className="text-[#FF8FA3] text-sm">✉</span> <span className="ml-1 text-xs font-mono font-medium bg-[#FFF0F3] border border-[#FCE8EC] px-2.5 py-1 rounded-full text-[#8E6B75]">{trans("matches.letters", { count: matches.length })}</span></h1>
        <div className="flex items-center gap-2">
          <Link href="/discover" className="text-xs font-semibold tracking-wide text-white btn-primary rounded-full px-4 py-2 shadow-sm">
            {t.matches.cards}
          </Link>
        </div>
      </div>

      <div className="shrink-0 px-4 py-3 flex gap-2 border-b border-[#FCE8EC]/60 bg-[#FFFCFA]/60">
        {[
          ["all", t.matches.tabsAll],
          ["new", t.matches.tabsNew],
          ["chatting", t.matches.tabsChatting],
        ].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v as any)} className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${tab === v ? "bg-[#2E1A22] text-white border-[#2E1A22] shadow-[0_4px_12px_rgba(46,26,34,0.18)]" : "bg-white border-[#FCE8EC] text-[#8E6B75] hover:border-[#FFD6DE] hover:text-[#2E1A22]"}`}>
            {l}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 text-center space-y-4 flex-1 grid place-items-center">
          <div>
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FFF0F3] to-[#FFE8EC] border border-[#FCE8EC] grid place-items-center mx-auto text-2xl shadow-sm">💌</div>
            <h3 className="font-display text-xl font-medium mt-4">{t.matches.emptyTitle}</h3>
            <p className="text-sm text-[#8E6B75] mt-2 leading-relaxed max-w-[32ch] mx-auto">{t.matches.emptyDesc}</p>
            <Link href="/discover" className="inline-flex h-11 px-7 rounded-full btn-primary items-center font-semibold text-sm mt-6">
              {t.matches.openCard}
            </Link>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-[#FCE8EC]/60 flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain">
          {filtered.map((m) => (
            <Link key={m.id} href={`/matches/${m.id}`} className="flex items-center gap-3.5 p-4 hover:bg-white/70 transition group">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FFE8EC] to-[#F3EFFF] border-2 border-white shadow-sm overflow-hidden flex-shrink-0 group-hover:shadow-[0_4px_12px_rgba(255,77,109,0.15)] transition">
                {m.other.photo ? <img src={m.other.photo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-[#FF8FA3]">♥</div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm truncate">{m.other.name}</span>
                  {m.other.intent && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FFF0F3] border border-[#FCE8EC] text-[#8E6B75]">{(t.intent as any)[m.other.intent] ?? m.other.intent}</span>}
                  {m.unread > 0 && <span className="w-5 h-5 rounded-full gradient-primary text-white text-[10px] font-bold grid place-items-center shadow-sm">{m.unread}</span>}
                </div>
                <div className="text-xs text-[#8E6B75] truncate font-display italic mt-0.5">{m.lastMessage ?? t.matches.lastMessageFallback}</div>
              </div>
              <div className="text-[11px] font-mono text-[#B08A95] bg-white border border-[#FCE8EC] px-2 py-1 rounded-full shrink-0">{new Date(m.lastMessageAt).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")}</div>
            </Link>
          ))}
        </div>
      )}

      <div className="shrink-0 p-3 bg-[#FFFCFA]/50 border-t border-[#FCE8EC]/50 text-center text-[11px] font-mono text-[#B08A95]">{t.matches.footer}</div>
    </div>
  );
}
