"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { usePopup } from "@/components/ui/PopupProvider";

export default function MatchesClient() {
  const { t, trans, locale } = useI18n();
  const { toast } = usePopup();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = (searchParams.get("tab") as any) ?? "all";
  const [matches, setMatches] = useState<any[]>([]);
  const [pendingLikes, setPendingLikes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "new" | "chatting" | "liked" | "favorites">(initialTab === "liked" ? "liked" : "all");
  const [liked, setLiked] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [likesLoading, setLikesLoading] = useState(false);

  // sync tab to URL
  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab === "liked" && tab !== "liked") setTab("liked");
  }, [searchParams]);

  const switchTab = (v: string) => {
    setTab(v as any);
    const params = new URLSearchParams(searchParams.toString());
    if (v === "liked") params.set("tab", "liked");
    else params.delete("tab");
    router.replace(`/matches${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
  };

  const reloadMatches = async () => {
    const d = await fetch("/api/matches").then((r) => r.json());
    setMatches(d.matches ?? []);
    setPendingLikes(d.pendingLikes ?? []);
    setLoading(false);
  };

  useEffect(() => {
    reloadMatches();
  }, []);

  useEffect(()=>{
    if(tab==="liked"){
      // use pendingLikes from matches if available, else fetch
      if (pendingLikes.length > 0 && liked.length === 0) {
        setLiked(pendingLikes.map((p: any) => ({ id: p.likeId, comment: p.comment, anchor: p.anchor, isPriority: p.isPriority, user: p.other, createdAt: p.createdAt })));
      } else {
        setLikesLoading(true);
        fetch("/api/likes?type=received").then(r=>r.json()).then(d=>{ setLiked(d.likes ?? []); setLikesLoading(false);});
      }
    }
    if(tab==="favorites"){
      setLikesLoading(true);
      fetch("/api/favorites").then(r=>r.json()).then(d=>{ setFavorites(d.favorites ?? []); setLikesLoading(false);});
    }
  },[tab, pendingLikes]);

  if (loading) return <div className="p-8 text-sm font-mono text-[#8E6B75] animate-pulse">{t.matches.loading}</div>;

  const filtered = matches.filter((m) => {
    if (tab === "new") return !m.lastMessage || m.lastMessage.startsWith("“");
    if (tab === "chatting") return m.lastMessage && !m.lastMessage.startsWith("“");
    return true;
  });

  return (
    <div className="max-w-2xl mx-auto w-full h-full max-h-[calc(100dvh-88px)] md:max-h-[calc(100dvh-1rem)] glass-strong md:rounded-[28px] overflow-hidden md:my-2 border border-white/60 shadow-[0_12px_40px_rgba(46,26,34,0.08)] flex flex-col">
      <div className="shrink-0 bg-white/80 backdrop-blur-xl border-b border-[#FCE8EC] px-5 py-4 flex items-center justify-between">
        <h1 className="font-display text-[22px] font-medium flex items-center gap-2">{t.matches.title} <span className="text-[#FF8FA3] text-sm">✉</span> <span className="ml-1 text-xs font-mono font-medium bg-[#FFF0F3] border border-[#FCE8EC] px-2.5 py-1 rounded-full text-[#8E6B75]">{trans("matches.letters", { count: matches.length + pendingLikes.length })}</span></h1>
        <div className="flex items-center gap-2">
          <Link href="/discover" className="text-xs font-semibold tracking-wide text-white btn-primary rounded-full px-4 py-2 shadow-sm">
            {t.matches.cards}
          </Link>
        </div>
      </div>

      <div className="shrink-0 px-4 py-3 flex gap-2 border-b border-[#FCE8EC]/60 bg-[#FFFCFA]/60 overflow-x-auto">
        {[
          ["all", t.matches.tabsAll],
          ["new", t.matches.tabsNew],
          ["chatting", t.matches.tabsChatting],
          ["liked", (t.matches as any).tabsLiked ?? "Ai thích mình"],
          ["favorites", (t.matches as any).tabsFavorites ?? "Đã lưu ♥"],
        ].map(([v, l]) => {
          const isLikedTab = v === "liked";
          const badge = isLikedTab && pendingLikes.length > 0 ? pendingLikes.length : undefined;
          return (
            <button key={v} onClick={() => switchTab(v)} className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all whitespace-nowrap flex items-center gap-1.5 ${tab === v ? "bg-[#2E1A22] text-white border-[#2E1A22] shadow-[0_4px_12px_rgba(46,26,34,0.18)]" : "bg-white border-[#FCE8EC] text-[#8E6B75] hover:border-[#FFD6DE] hover:text-[#2E1A22]"}`}>
              {l} {badge ? <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold grid place-items-center ${tab===v ? "bg-[#FF4D6D] text-white" : "bg-[#FF4D6D] text-white"}`}>{badge}</span> : null}
            </button>
          );
        })}
      </div>

      {/* Banner pending likes khi ở tab all và có pending */}
      {tab === "all" && pendingLikes.length > 0 && (
        <div className="shrink-0 mx-4 mt-3 rounded-[16px] bg-amber-50 border border-amber-200 p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-400 text-white grid place-items-center text-sm">✉</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-[#7A5A2E]">Bạn có {pendingLikes.length} bưu thiếp mới chưa xem</div>
            <div className="text-xs text-[#8E6B75] truncate">Họ đã gửi kèm lời nhắn — đáp lại để tạo kết nối ♥</div>
          </div>
          <button onClick={() => switchTab("liked")} className="px-4 py-2 rounded-full bg-[#1A1A1E] text-white text-xs font-semibold shrink-0">Xem ngay →</button>
        </div>
      )}

      {tab==="liked" ? (
        likesLoading ? <div className="p-8 text-sm animate-pulse">Đang tải...</div> :
        liked.length===0 ? <div className="p-10 text-center text-sm text-[#8E6B75]">{(t.matches as any).noLiked ?? "Chưa có ai thích bạn — hãy đi khám phá!"}</div> :
        <div className="divide-y divide-[#FCE8EC]/60 flex-1 min-h-0 overflow-y-auto">
          {liked.map((l:any)=>(
            <div key={l.id} className="flex items-center gap-3.5 p-4 hover:bg-white/70">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-[#FFE8EC] border-2 border-white shadow-sm">{l.user.photo ? <img src={l.user.photo} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full grid place-items-center text-[#FF8FA3]">♥</div>}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm flex items-center gap-2">{l.user.name} {l.user.isVerified && <span className="w-4 h-4 rounded-full bg-[#1DA1F2] text-white grid place-items-center text-[8px]">✓</span>} {l.isPriority && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400 text-white">✦ Ưu tiên</span>}</div>
                <div className="text-xs italic text-[#8E6B75] truncate">“{l.comment}” {l.anchor && <span className="text-[#FF4D6D]">· {l.anchor}</span>}</div>
              </div>
              <button onClick={async()=>{
                const r=await fetch("/api/discover/like",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({toUserId:l.user.id, comment: `Cảm ơn vì “${l.comment.slice(0,30)}” — mình cũng thích bạn`, anchor:l.anchor})});
                const d=await r.json(); if(d.status?.includes("MATCH")) { toast("Đã ghép đôi ♥ — đã vào hòm thư", "success"); } else if(r.ok) toast("Đã gửi bưu thiếp", "success"); else toast(d.error, "error");
                await reloadMatches();
                setLiked(prev=>prev.filter(x=>x.id!==l.id));
                setPendingLikes(prev=>prev.filter((x:any)=>x.likeId!==l.id && x.id!==`like_${l.id}`));
                if (d.status?.includes("MATCH")) switchTab("all");
              }} className="px-3 py-1.5 rounded-full bg-[#2E1A22] text-white text-xs font-semibold">{(t.matches as any).reply ?? "Đáp lại"}</button>
            </div>
          ))}
        </div>
      ) : tab==="favorites" ? (
        likesLoading ? <div className="p-8 text-sm animate-pulse">Đang tải...</div> :
        favorites.length===0 ? <div className="p-10 text-center text-sm text-[#8E6B75]">{(t.matches as any).noFavorites ?? "Chưa lưu ai"}</div> :
        <div className="divide-y divide-[#FCE8EC]/60 flex-1 min-h-0 overflow-y-auto">
          {favorites.map((f:any)=>(
            <div key={f.id} className="flex items-center gap-3.5 p-4 hover:bg-white/70">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-[#FFE8EC] border-2 border-white">{f.user.photo ? <img src={f.user.photo} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full grid place-items-center text-[#FF8FA3]">♥</div>}</div>
              <div className="flex-1 min-w-0"><div className="font-semibold text-sm">{f.user.name}</div><div className="text-xs text-[#8E6B75] truncate">{f.user.bio ?? ""}</div></div>
              <button onClick={async()=>{ await fetch(`/api/favorites?targetId=${f.user.id}`,{method:"DELETE"}); setFavorites(prev=>prev.filter((x:any)=>x.user.id!==f.user.id)); toast("Đã bỏ lưu", "success");}} className="text-xs underline">{(t.matches as any).removeFavorite ?? "Bỏ lưu"}</button>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 && pendingLikes.length===0 ? (
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
      ) : filtered.length === 0 && pendingLikes.length>0 && tab==="all" ? (
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-[#FCE8EC]/60">
          {pendingLikes.map((p:any)=>(
            <div key={p.id} className="flex items-center gap-3.5 p-4 hover:bg-amber-50/50 bg-amber-50/30">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-[#FFE8EC] border-2 border-amber-200 shadow-sm">{p.other.photo ? <img src={p.other.photo} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full grid place-items-center text-[#FF8FA3]">♥</div>}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm flex items-center gap-2">{p.other.name} <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400 text-white">Bưu thiếp mới</span></div>
                <div className="text-xs italic text-[#8E6B75] truncate">{p.lastMessage}</div>
              </div>
              <button onClick={() => switchTab("liked")} className="px-3 py-1.5 rounded-full bg-amber-500 text-white text-xs font-semibold">Xem</button>
            </div>
          ))}
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
