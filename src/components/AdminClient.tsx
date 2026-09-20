"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import { useI18n } from "@/lib/i18n/context";

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return String(iso); }
}

export default function AdminClient({ isAdmin }: { isAdmin: boolean }) {
  const { t, trans } = useI18n();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    fetch("/api/admin/stats").then((r) => r.json()).then((d) => { setData(d); setLoading(false); });
  }, [isAdmin]);

  const statusLabel = (s?: string) => (s && (t.admin as any)?.status?.[s]) ? (t.admin as any).status[s] : s ?? "—";
  const moderate = (targetUserId: string, action: "SUSPEND" | "ACTIVATE") => {
    fetch("/api/admin/stats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId, action }) }).then(() => location.reload());
  };
  const openProfile = async (userId: string) => {
    setDetailLoading(true); setDetailError(false); setDetail({ user: { id: userId } });
    try {
      const r = await fetch(`/api/admin/users/${userId}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setDetail(d);
    } catch { setDetailError(true); } finally { setDetailLoading(false); }
  };
  const closeModal = () => { setDetail(null); setDetailError(false); setDetailLoading(false); };

  const interestsOf = (u: any): string[] => {
    try { const a = JSON.parse(u?.profile?.interests ?? "[]"); return Array.isArray(a) ? a : []; } catch { return []; }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex">
        <Nav />
        <div className="flex-1 grid place-items-center p-8">
          <div className="max-w-md w-full bg-white rounded-2xl border p-8 text-center space-y-3">
            <h1 className="text-xl font-semibold">{(t.admin as any).accessRequired}</h1>
            <p className="text-sm text-zinc-600">{(t.admin as any).accessDesc}</p>
            <code className="block bg-zinc-100 p-3 rounded-xl text-xs text-left">{(t.admin as any).accessCodeHint}</code>
            <Link href="/discover" className="inline-flex h-11 px-6 rounded-full bg-zinc-900 text-white items-center text-sm">{(t.admin as any).backToApp}</Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen md:h-[100dvh] flex overflow-hidden">
        <Nav />
        <main className="flex-1 min-w-0 overflow-hidden p-4 sm:p-6 md:p-6 lg:p-8">
          <div className="h-full min-h-0 max-w-[1200px] mx-auto w-full rounded-[24px] md:rounded-[28px] glass-strong border border-white/70 p-5 md:p-7 shadow-[0_12px_40px_rgba(46,26,34,0.08)] overflow-hidden">
            <div className="grid h-full place-items-center">
              <div className="text-sm font-mono text-[#8E6B75] animate-pulse">{(t.admin as any).loading}</div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const s = (t.admin as any).stats;
  const stats: [string, number][] = [
    [s.totalUsers, data.totalUsers],
    [s.activeUsers, data.activeUsers],
    [s.newToday, data.newToday],
    [s.matchesToday, data.matchesToday],
    [s.messagesToday, data.messagesToday],
    [s.reportsToday, data.reportsToday],
    [s.discoveryToday, data.discoveryToday],
  ];

  return (
    <>
      <div className="h-screen md:h-[100dvh] flex overflow-hidden">
        <Nav />
        <main className="flex-1 min-w-0 overflow-hidden p-4 sm:p-6 md:p-6 lg:p-8">
          <div className="h-full min-h-0 max-w-[1200px] mx-auto w-full rounded-[24px] md:rounded-[28px] glass-strong border border-white/70 p-4 sm:p-5 md:p-6 lg:p-7 shadow-[0_12px_40px_rgba(46,26,34,0.08)] overflow-hidden flex flex-col gap-3 md:gap-5">
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-3">
              <h1 className="font-display text-[24px] md:text-[30px] font-medium text-[#2E1A22]">{(t.admin as any).title}</h1>
              <span className="text-[11px] md:text-xs font-mono text-[#B08A95] bg-[#FFF0F3] border border-[#FCE8EC] rounded-full px-2.5 md:px-3 py-1">{(t.admin as any).moderationBadge}</span>
            </div>

            <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-4">
              {stats.map(([label, v]) => (
                <div key={label} className="rounded-[18px] md:rounded-[20px] border border-[#FCE8EC] bg-white/85 p-3 md:p-4 shadow-[0_4px_16px_rgba(46,26,34,0.05)]">
                  <div className="text-[11px] md:text-xs text-[#8E6B75]">{label}</div>
                  <div className="text-lg md:text-2xl font-semibold text-[#2E1A22] mt-1">{v as number}</div>
                </div>
              ))}
            </div>

            <div className="flex-1 min-h-0 grid md:grid-cols-2 gap-3 md:gap-5">
              <div className="h-full min-h-0 rounded-[20px] md:rounded-[24px] border border-[#FCE8EC] bg-white/85 p-3.5 md:p-5 shadow-[0_4px_16px_rgba(46,26,34,0.05)] overflow-hidden flex flex-col">
                <h2 className="shrink-0 font-medium mb-2.5 md:mb-3 text-[#2E1A22] flex items-center justify-between">
                  {(t.admin as any).recentUsers}
                  <span className="text-[11px] font-mono text-[#B08A95] font-normal">{(t.admin as any).clickToView}</span>
                </h2>
                <div className="flex-1 min-h-0 space-y-2 overflow-y-auto pr-1">
                  {data.recentUsers.length === 0 ? <div className="text-sm text-[#B08A95]">{(t.admin as any).noUsers}</div> : data.recentUsers.map((u: any) => (
                    <div key={u.id} className="group flex items-center gap-3 text-sm rounded-[16px] border border-[#FCE8EC] bg-white px-3 py-2 hover:border-[#FFD6DE] hover:bg-[#FFFCFA] transition cursor-pointer" onClick={() => openProfile(u.id)} role="button" tabIndex={0} onKeyDown={(e)=> e.key==='Enter' && openProfile(u.id)}>
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-[#FFE8EC] shrink-0 border border-white shadow-sm">
                        {u.photos?.[0]?.url ? <img src={u.photos[0].url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-[#FF4D6D] text-sm">♥</div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-[#2E1A22] truncate flex items-center gap-1.5">
                          {u.profile?.firstName ?? u.name ?? u.email}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${u.status==='ACTIVE' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : u.status==='SUSPENDED' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-zinc-100 border-zinc-200 text-zinc-600'}`}>{statusLabel(u.status)}</span>
                        </div>
                        <div className="text-xs text-[#B08A95] truncate">{u.email}</div>
                      </div>
                      <div className="flex gap-1 shrink-0 ml-1" onClick={(e)=>e.stopPropagation()}>
                        <button type="button" onClick={() => openProfile(u.id)} className="text-xs border border-[#E8B4C8] bg-[#FFF0F3] text-[#8E6B75] rounded-full px-2.5 py-1 hover:bg-[#FFD6DE] hidden sm:inline-flex" title={(t.admin as any).viewProfile}>{(t.admin as any).viewProfile}</button>
                        {u.status !== "SUSPENDED" ? (
                          <button type="button" onClick={() => moderate(u.id, "SUSPEND")} className="text-xs border border-amber-200 bg-amber-50 text-amber-700 rounded-full px-2.5 py-1 hover:bg-amber-100">{(t.admin as any).suspend}</button>
                        ) : (
                          <button type="button" onClick={() => moderate(u.id, "ACTIVATE")} className="text-xs border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-full px-2.5 py-1 hover:bg-emerald-100">{(t.admin as any).activate}</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-full min-h-0 rounded-[20px] md:rounded-[24px] border border-[#FCE8EC] bg-white/85 p-3.5 md:p-5 shadow-[0_4px_16px_rgba(46,26,34,0.05)] overflow-hidden flex flex-col">
                <h2 className="shrink-0 font-medium mb-2.5 md:mb-3 text-[#2E1A22]">{(t.admin as any).recentReports}</h2>
                <div className="flex-1 min-h-0 space-y-2 overflow-y-auto pr-1">
                  {data.recentReports.length === 0 ? <div className="text-sm text-[#B08A95]">{(t.admin as any).noReports}</div> : data.recentReports.map((r: any) => (
                    <div key={r.id} className="text-sm rounded-[16px] border border-[#FCE8EC] bg-white px-3 py-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-[#2E1A22]">{r.reason}</span>
                        <span className="text-xs text-[#B08A95]">{statusLabel(r.status)}</span>
                      </div>
                      <div className="text-xs text-[#B08A95] mt-1 flex flex-wrap gap-1">
                        <span>{(t.admin as any).reporter}: <button onClick={()=>openProfile(r.reporterId)} className="underline hover:text-[#FF4D6D]">{r.reporter?.email ?? r.reporterId.slice(0,8)}</button></span>
                        <span>→ {(t.admin as any).reported}: <button onClick={()=>openProfile(r.reportedId)} className="underline hover:text-[#FF4D6D]">{r.reported?.email ?? r.reportedId.slice(0,8)}</button></span>
                      </div>
                      {r.details && <div className="text-xs mt-1 text-[#6E4A56] line-clamp-2">{r.details}</div>}
                      <div className="text-[11px] font-mono text-[#B08A95] mt-1">{fmtDate(r.createdAt)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {(detail || detailLoading || detailError) && (
        <div className="fixed inset-0 z-[80] bg-[#2E1A22]/45 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto" onClick={(e)=> { if(e.target===e.currentTarget) closeModal(); }}>
          <div className="w-full max-w-[720px] max-h-[90vh] overflow-hidden rounded-[24px] bg-white border border-[#FCE8EC] shadow-[0_20px_60px_rgba(46,26,34,0.25)] flex flex-col">
            <div className="shrink-0 flex items-center justify-between p-4 sm:p-5 border-b border-[#FCE8EC] bg-[#FFFCFA]">
              <h3 className="font-semibold text-[#2E1A22]">{(t.admin as any).profileModal.title}</h3>
              <button onClick={closeModal} className="w-8 h-8 grid place-items-center rounded-full bg-white border border-[#FCE8EC] hover:bg-[#FFF0F3] text-[#8E6B75]">✕</button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
              {detailLoading && <div className="text-sm text-[#8E6B75] animate-pulse py-12 text-center">{(t.admin as any).profileModal.loading}</div>}
              {detailError && <div className="text-sm text-red-600 py-8 text-center">{(t.admin as any).profileModal.error}</div>}
              {detail && !detailLoading && !detailError && detail.user && (
                <>
                  {detail.user.profile ? (
                    <>
                      <div className="flex gap-4">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#FFE8EC] shrink-0 border border-[#FCE8EC]">
                          {detail.user.photos?.[0]?.url ? <img src={detail.user.photos[0].url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-[#B08A95] text-xs">{(t.admin as any).profileModal.noPhotos}</div>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-[#2E1A22] text-lg">{detail.user.profile.firstName} <span className="text-sm font-normal text-[#8E6B75]">{detail.user.profile.gender} · {detail.user.profile.location ?? "—"}</span></div>
                          <div className="text-xs font-mono text-[#B08A95] truncate">{(t.admin as any).email}: {detail.user.email} · {(t.admin as any).id}: {detail.user.id.slice(0,8)}</div>
                          <div className="text-xs text-[#8E6B75] mt-1">{(t.admin as any).profileModal.accountStatus}: <span className={`px-2 py-0.5 rounded-full text-[11px] border ${detail.user.status==='ACTIVE'?'bg-emerald-50 border-emerald-200 text-emerald-700':'bg-amber-50 border-amber-200 text-amber-700'}`}>{statusLabel(detail.user.status)}</span> · {(t.admin as any).createdAt}: {fmtDate(detail.user.createdAt)}</div>
                        </div>
                      </div>

                      {detail.user.photos?.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-[#8E6B75] mb-2">{(t.admin as any).profileModal.photos} ({detail.user.photos.length})</div>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {detail.user.photos.map((p:any)=> <div key={p.id} className="aspect-[3/4] rounded-xl overflow-hidden bg-[#FFE8EC] border border-[#FCE8EC]"><img src={p.url} alt="" className="w-full h-full object-cover" /></div>)}
                          </div>
                        </div>
                      )}

                      <div className="rounded-2xl border border-[#FCE8EC] bg-[#FFFCFA] p-3 space-y-2">
                        <div className="text-xs font-semibold text-[#2E1A22]">{(t.admin as any).profileModal.bio}</div>
                        <div className="text-sm text-[#6E4A56] leading-relaxed">{detail.user.profile.bio || (t.admin as any).profileModal.noBio}</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><span className="text-[#B08A95]">{(t.admin as any).profileModal.location}:</span> {detail.user.profile.location ?? "—"}</div>
                          <div><span className="text-[#B08A95]">{(t.admin as any).profileModal.occupation}:</span> {detail.user.profile.occupation ?? "—"}</div>
                          <div><span className="text-[#B08A95]">{(t.admin as any).profileModal.education}:</span> {detail.user.profile.education ?? "—"}</div>
                          <div><span className="text-[#B08A95]">{(t.admin as any).profileModal.voice}:</span> {detail.user.profile.voiceUrl ? <a href={detail.user.profile.voiceUrl} target="_blank" className="underline text-[#FF4D6D]">▶ {detail.user.profile.voiceDuration ?? 15}s</a> : "—"}</div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[#FCE8EC] bg-white p-3">
                        <div className="text-xs font-semibold text-[#2E1A22] mb-2">{(t.admin as any).profileModal.interests}</div>
                        {interestsOf(detail.user).length ? <div className="flex flex-wrap gap-1.5">{interestsOf(detail.user).map((x:string)=> <span key={x} className="text-xs bg-[#FFF0F3] border border-[#FCE8EC] px-2.5 py-1 rounded-full text-[#8E6B75]">{x}</span>)}</div> : <div className="text-xs text-[#B08A95]">{(t.admin as any).profileModal.noInterests}</div>}
                      </div>

                      <div className="rounded-2xl border border-[#FCE8EC] bg-white p-3">
                        <div className="text-xs font-semibold text-[#2E1A22] mb-2">{(t.admin as any).profileModal.prompts}</div>
                        {detail.user.promptAnswers?.length ? <div className="space-y-2">{detail.user.promptAnswers.map((pa:any)=> <div key={pa.id} className="rounded-xl bg-[#FFFCFA] border border-[#FCE8EC] p-3"><div className="text-[11px] font-mono uppercase tracking-wide text-[#FF4D6D]">{pa.question}</div><div className="text-sm text-[#2E1A22] mt-1">{pa.answer}</div></div>)}</div> : <div className="text-xs text-[#B08A95]">{(t.admin as any).profileModal.noPrompts}</div>}
                      </div>

                      <div className="rounded-2xl border border-[#FCE8EC] bg-white p-3">
                        <div className="text-xs font-semibold text-[#2E1A22] mb-2">{(t.admin as any).profileModal.preferences}</div>
                        {detail.user.preferences ? (
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div><span className="text-[#B08A95]">{(t.admin as any).profileModal.interestedIn}:</span> {detail.user.preferences.interestedIn}</div>
                            <div><span className="text-[#B08A95]">{(t.admin as any).profileModal.intent}:</span> {detail.user.preferences.intent}</div>
                            <div><span className="text-[#B08A95]">{(t.admin as any).profileModal.ageRange}:</span> {detail.user.preferences.minAge}–{detail.user.preferences.maxAge}</div>
                            <div><span className="text-[#B08A95]">{(t.admin as any).profileModal.distance}:</span> {detail.user.preferences.maxDistance ? `${detail.user.preferences.maxDistance} km` : "—"}</div>
                          </div>
                        ) : <div className="text-xs text-[#B08A95]">—</div>}
                      </div>

                      {detail.user.dailyAnswers?.length > 0 && (
                        <div className="rounded-2xl border border-[#FCE8EC] bg-white p-3">
                          <div className="text-xs font-semibold text-[#2E1A22] mb-2">{(t.admin as any).profileModal.dailyAnswer}</div>
                          <div className="space-y-2">{detail.user.dailyAnswers.map((da:any)=> <div key={da.id} className="text-xs"><span className="font-mono text-[#B08A95]">{da.date}:</span> <span className="text-[#2E1A22]">{da.answer}</span></div>)}</div>
                        </div>
                      )}

                      {detail.stats && (
                        <div className="grid grid-cols-4 gap-2 text-center">
                          {[["Likes sent", detail.stats.likesSent], ["Likes got", detail.stats.likesReceived], ["Matches", detail.stats.matchesCount], ["Reports", detail.stats.reportsAgainst]].map(([k,v]: any)=> (
                            <div key={k} className="rounded-xl border border-[#FCE8EC] bg-[#FFFCFA] p-2"><div className="text-[11px] text-[#B08A95]">{k}</div><div className="font-semibold text-[#2E1A22]">{v}</div></div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        {detail.user.status !== "SUSPENDED" ? (
                          <button onClick={()=>{ moderate(detail.user.id,"SUSPEND"); closeModal(); }} className="flex-1 h-10 rounded-full bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600">{(t.admin as any).suspend}</button>
                        ) : (
                          <button onClick={()=>{ moderate(detail.user.id,"ACTIVATE"); closeModal(); }} className="flex-1 h-10 rounded-full bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">{(t.admin as any).activate}</button>
                        )}
                        <button onClick={closeModal} className="flex-1 h-10 rounded-full border border-[#FCE8EC] bg-white text-sm font-semibold hover:bg-[#FFF0F3]">{(t.admin as any).profileModal.close}</button>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-[#B08A95] py-6 text-center">No profile yet (onboarding incomplete) — {detail.user.email}</div>
                  )}
                  {!detail.user.profile && detail.user.status && (
                    <div className="flex gap-2 pt-2">
                      {detail.user.status !== "SUSPENDED" ? (
                        <button onClick={()=>{ moderate(detail.user.id,"SUSPEND"); closeModal(); }} className="flex-1 h-10 rounded-full bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600">{(t.admin as any).suspend}</button>
                      ) : (
                        <button onClick={()=>{ moderate(detail.user.id,"ACTIVATE"); closeModal(); }} className="flex-1 h-10 rounded-full bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">{(t.admin as any).activate}</button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
