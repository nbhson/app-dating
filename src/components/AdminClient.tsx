"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import { useI18n } from "@/lib/i18n/context";
import { usePopup } from "@/components/ui/PopupProvider";

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return String(iso); }
}

type Tab = "overview"|"users"|"reports"|"questions"|"moderation"|"analytics"|"config"|"announcements"|"audit"|"verification";

export default function AdminClient({ isAdmin }: { isAdmin: boolean }) {
  const { t, trans } = useI18n();
  const { toast, confirm } = usePopup();
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);

  // users tab
  const [users, setUsers] = useState<any[]>([]);
  const [usersQ, setUsersQ] = useState("");
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersStatus, setUsersStatus] = useState("");

  // reports
  const [reports, setReports] = useState<any[]>([]);
  const [reportsStatus, setReportsStatus] = useState("PENDING");

  // daily questions
  const [dqList, setDqList] = useState<any[]>([]);
  const [dqDate, setDqDate] = useState(new Date().toISOString().slice(0,10));
  const [dqQuestion, setDqQuestion] = useState("");

  // moderation
  const [modType, setModType] = useState("photos");
  const [modData, setModData] = useState<any>(null);

  // analytics
  const [analytics, setAnalytics] = useState<any>(null);

  // config
  const [config, setConfig] = useState<Record<string,string>>({});
  const [configKey, setConfigKey] = useState("DAILY_LIMIT");
  const [configVal, setConfigVal] = useState("20");

  // announcements
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");

  // audit
  const [audit, setAudit] = useState<any[]>([]);

  // verification
  const [verifs, setVerifs] = useState<any[]>([]);

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    fetch("/api/admin/stats").then((r) => r.json()).then((d) => { setData(d); setLoading(false); });
  }, [isAdmin]);

  useEffect(()=>{
    if(!isAdmin) return;
    if(tab==="users") fetch(`/api/admin/users?q=${encodeURIComponent(usersQ)}&status=${usersStatus}&page=${usersPage}&limit=20`).then(r=>r.json()).then(d=>{ setUsers(d.users??[]); setUsersTotal(d.total??0);});
    if(tab==="reports") fetch(`/api/admin/reports?status=${reportsStatus}`).then(r=>r.json()).then(d=> setReports(d.reports??[]));
    if(tab==="questions") fetch("/api/admin/daily-questions").then(r=>r.json()).then(d=> setDqList(d.questions??[]));
    if(tab==="moderation") fetch(`/api/admin/moderation?type=${modType}`).then(r=>r.json()).then(d=> setModData(d));
    if(tab==="analytics") fetch("/api/admin/analytics").then(r=>r.json()).then(d=> setAnalytics(d));
    if(tab==="config") fetch("/api/admin/config").then(r=>r.json()).then(d=> setConfig(d.configs??{}));
    if(tab==="announcements") fetch("/api/admin/announcements").then(r=>r.json()).then(d=> setAnnouncements(d.announcements??[]));
    if(tab==="audit") fetch("/api/admin/audit").then(r=>r.json()).then(d=> setAudit(d.actions??[]));
    if(tab==="verification") fetch("/api/admin/verification?status=PENDING").then(r=>r.json()).then(d=> setVerifs(d.requests??[]));
  },[tab, isAdmin, usersQ, usersStatus, usersPage, reportsStatus, modType]);

  const statusLabel = (s?: string) => (s && (t.admin as any)?.status?.[s]) ? (t.admin as any).status[s] : s ?? "—";
  const moderate = (targetUserId: string, action: "SUSPEND" | "ACTIVATE") => {
    fetch("/api/admin/stats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId, action }) }).then(() => location.reload());
  };
  const handleSuspendUser = (uid: string) => {
    fetch("/api/admin/stats",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({targetUserId:uid, action:"SUSPEND"})}).then(()=> setUsers(prev=>prev.map(x=> x.id===uid ? Object.assign({}, x, {status:"SUSPENDED"}) : x)));
  };
  const handleActivateUser = (uid: string) => {
    fetch("/api/admin/stats",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({targetUserId:uid, action:"ACTIVATE"})}).then(()=> setUsers(prev=>prev.map(x=> x.id===uid ? Object.assign({}, x, {status:"ACTIVE"}) : x)));
  };
  const toggleAnnouncement = async (a: any) => {
    await fetch("/api/admin/announcements",{method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({id:a.id, isActive:!a.isActive})});
    setAnnouncements(prev=>prev.map(x=> x.id===a.id ? Object.assign({}, x, {isActive: !x.isActive}) : x));
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

  const atabs = (t.admin as any).tabs;
  const tabs: [Tab,string][] = [
    ["overview", atabs.overview],
    ["users", atabs.users],
    ["reports", atabs.reports],
    ["questions", atabs.questions],
    ["moderation", atabs.moderation],
    ["verification", atabs.verification],
    ["analytics", atabs.analytics],
    ["announcements", atabs.announcements],
    ["config", atabs.config],
    ["audit", atabs.audit],
  ];

  return (
    <>
      <div className="h-screen md:h-[100dvh] flex overflow-hidden">
        <Nav />
        <main className="flex-1 min-w-0 overflow-hidden p-4 sm:p-6 md:p-6 lg:p-8">
          <div className="h-full min-h-0 max-w-[1200px] mx-auto w-full rounded-[24px] md:rounded-[28px] glass-strong border border-white/70 p-4 sm:p-5 md:p-6 lg:p-7 shadow-[0_12px_40px_rgba(46,26,34,0.08)] overflow-hidden flex flex-col gap-3 md:gap-5">
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-3">
              <h1 className="font-display text-[22px] md:text-[28px] font-medium text-[#2E1A22]">{(t.admin as any).title}</h1>
              <span className="text-[11px] md:text-xs font-mono text-[#B08A95] bg-[#FFF0F3] border border-[#FCE8EC] rounded-full px-2.5 md:px-3 py-1">{(t.admin as any).moderationBadge}</span>
            </div>

            <div className="shrink-0 flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {tabs.map(([k,label])=>(
                <button key={k} onClick={()=>setTab(k)} className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap border transition ${tab===k ? "bg-[#2E1A22] text-white border-[#2E1A22]" : "bg-white border-[#FCE8EC] text-[#8E6B75] hover:border-[#FFD6DE]"}`}>{label}</button>
              ))}
            </div>

            {tab==="overview" && (
              <>
                <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-4">
                  {stats.map(([label, v]) => (
                    <div key={label} className="rounded-[18px] md:rounded-[20px] border border-[#FCE8EC] bg-white/85 p-3 md:p-4 shadow-[0_4px_16px_rgba(46,26,34,0.05)]">
                      <div className="text-[11px] md:text-xs text-[#8E6B75]">{label}</div>
                      <div className="text-lg md:text-2xl font-semibold text-[#2E1A22] mt-1">{v as number}</div>
                    </div>
                  ))}
                </div>
                <div className="flex-1 min-h-0 grid md:grid-cols-2 gap-3 md:gap-5 overflow-hidden">
                  <div className="h-full min-h-0 rounded-[20px] border border-[#FCE8EC] bg-white/85 p-3.5 md:p-5 flex flex-col overflow-hidden">
                    <h2 className="font-medium mb-2.5 text-[#2E1A22] flex justify-between">{(t.admin as any).recentUsers} <span className="text-[11px] font-mono text-[#B08A95]">{(t.admin as any).clickToView}</span></h2>
                    <div className="flex-1 min-h-0 space-y-2 overflow-y-auto pr-1">
                      {data.recentUsers.map((u:any)=>(
                        <div key={u.id} className="flex items-center gap-3 text-sm rounded-[16px] border border-[#FCE8EC] bg-white px-3 py-2 cursor-pointer" onClick={()=>openProfile(u.id)}>
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-[#FFE8EC] border border-white">{u.photos?.[0]?.url ? <img src={u.photos[0].url} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full grid place-items-center text-[#FF4D6D]">♥</div>}</div>
                          <div className="flex-1 min-w-0"><div className="font-medium truncate">{u.profile?.firstName ?? u.email} <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${u.status==='ACTIVE'?'bg-emerald-50 border-emerald-200 text-emerald-700':'bg-amber-50 border-amber-200 text-amber-700'}`}>{statusLabel(u.status)}</span></div><div className="text-xs text-[#B08A95] truncate">{u.email}</div></div>
                          <div className="flex gap-1" onClick={(e)=>e.stopPropagation()}>
                            <button onClick={()=>openProfile(u.id)} className="text-xs border bg-[#FFF0F3] rounded-full px-2.5 py-1 hidden sm:inline-flex">Xem</button>
                            {u.status!=="SUSPENDED" ? <button onClick={()=>moderate(u.id,"SUSPEND")} className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-2.5 py-1">Khóa</button> : <button onClick={()=>moderate(u.id,"ACTIVATE")} className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full px-2.5 py-1">Mở</button>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="h-full min-h-0 rounded-[20px] border border-[#FCE8EC] bg-white/85 p-3.5 md:p-5 flex flex-col overflow-hidden">
                    <h2 className="font-medium mb-2.5 text-[#2E1A22]">{(t.admin as any).recentReports}</h2>
                    <div className="flex-1 min-h-0 space-y-2 overflow-y-auto pr-1">
                      {data.recentReports.length===0 ? <div className="text-sm text-[#B08A95]">{(t.admin as any).noReports}</div> : data.recentReports.map((r:any)=>(
                        <div key={r.id} className="text-sm rounded-[16px] border border-[#FCE8EC] bg-white px-3 py-2">
                          <div className="flex gap-1.5"><span className="font-medium">{r.reason}</span><span className="text-xs text-[#B08A95]">{statusLabel(r.status)}</span></div>
                          <div className="text-xs text-[#B08A95] mt-1"><button onClick={()=>openProfile(r.reporterId)} className="underline">{r.reporter?.email}</button> → <button onClick={()=>openProfile(r.reportedId)} className="underline">{r.reported?.email}</button></div>
                          {r.details && <div className="text-xs mt-1 text-[#6E4A56] line-clamp-2">{r.details}</div>}
                          <div className="text-[11px] font-mono text-[#B08A95] mt-1">{fmtDate(r.createdAt)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {tab==="users" && (
              <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
                <div className="flex flex-wrap gap-2">
                  <input value={usersQ} onChange={(e)=>{setUsersQ(e.target.value); setUsersPage(1);}} placeholder={(t.admin as any).usersView.searchPlaceholder} className="h-10 rounded-full border border-[#FCE8EC] bg-white px-4 text-sm flex-1 min-w-[180px]" />
                  <select value={usersStatus} onChange={(e)=>{setUsersStatus(e.target.value); setUsersPage(1);}} className="h-10 rounded-full border border-[#FCE8EC] bg-white px-3 text-sm">
                    <option value="">{(t.admin as any).usersView.statusAll}</option><option value="ACTIVE">ACTIVE</option><option value="SUSPENDED">SUSPENDED</option><option value="DELETED">DELETED</option>
                  </select>
                  <span className="text-xs font-mono bg-white border border-[#FCE8EC] px-3 py-2 rounded-full self-center">{trans("admin.usersView.totalResults", {count: usersTotal})}</span>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                  {users.map((u:any)=>(
                    <div key={u.id} className="flex items-center gap-3 text-sm rounded-[16px] border border-[#FCE8EC] bg-white px-3 py-2 cursor-pointer" onClick={()=>openProfile(u.id)}>
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-[#FFE8EC] border border-white">{u.photos?.[0]?.url ? <img src={u.photos[0].url} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full grid place-items-center text-[#FF4D6D]">♥</div>}</div>
                      <div className="flex-1 min-w-0"><div className="font-medium truncate">{u.profile?.firstName ?? u.name ?? u.email} {u.isVerified && <span className="text-[#1DA1F2]">✓</span>} <span className="text-[10px] px-1.5 py-0.5 rounded-full border ml-1">{u.status}</span></div><div className="text-xs text-[#B08A95] truncate">{u.email}</div></div>
                       <div className="flex gap-1" onClick={(e)=>e.stopPropagation()}>
                        {u.status!=="SUSPENDED" ? <button onClick={()=>handleSuspendUser(u.id)} className="text-xs bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">{(t.admin as any).suspend}</button> : <button onClick={()=>handleActivateUser(u.id)} className="text-xs bg-emerald-50 border rounded-full px-2.5 py-1">{(t.admin as any).activate}</button>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 justify-center">
                  <button disabled={usersPage<=1} onClick={()=>setUsersPage(p=>Math.max(1,p-1))} className="px-4 py-2 rounded-full bg-white border border-[#FCE8EC] text-sm disabled:opacity-40">{(t.admin as any).usersView.prev}</button>
                  <span className="px-3 py-2 text-sm font-mono">{trans("admin.usersView.page", {page: usersPage})}</span>
                  <button onClick={()=>setUsersPage(p=>p+1)} className="px-4 py-2 rounded-full bg-white border border-[#FCE8EC] text-sm">{(t.admin as any).usersView.next}</button>
                </div>
              </div>
            )}

            {tab==="reports" && (
              <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
                <div className="flex gap-2 flex-wrap">
                  {[
                    ["PENDING",(t.admin as any).reportsView.pending],
                    ["RESOLVED",(t.admin as any).reportsView.resolved],
                    ["DISMISSED",(t.admin as any).reportsView.dismissed],
                    ["",(t.admin as any).reportsView.all],
                  ].map(([s,label])=>(
                    <button key={s||"all"} onClick={()=>setReportsStatus(s)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${reportsStatus===s ? "bg-[#2E1A22] text-white border-[#2E1A22]" : "bg-white border-[#FCE8EC]"}`}>{label}</button>
                  ))}
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                  {reports.map((r:any)=>(
                    <div key={r.id} className="rounded-2xl border border-[#FCE8EC] bg-white p-3">
                      <div className="flex flex-wrap items-center gap-2 text-sm"><span className="font-semibold">{r.reason}</span><span className={`text-xs px-2 py-0.5 rounded-full border ${r.status==='PENDING'?'bg-amber-50 border-amber-200 text-amber-700': r.status==='RESOLVED'?'bg-emerald-50 border-emerald-200 text-emerald-700':'bg-zinc-100 border-zinc-200'}`}>{r.status}</span><span className="text-xs text-[#B08A95] ml-auto">{fmtDate(r.createdAt)}</span></div>
                      <div className="text-xs text-[#8E6B75] mt-1">{r.reporter?.email} → {r.reported?.email}</div>
                      {r.details && <div className="text-sm mt-1">{r.details}</div>}
                      {r.status==="PENDING" && (
                        <div className="flex gap-2 mt-2">
                          <button onClick={async()=>{ await fetch("/api/admin/reports",{method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({reportId:r.id, status:"RESOLVED", actionTaken:"SUSPEND", resolutionNote:"Vi phạm"})}); setReports(prev=>prev.filter(x=>x.id!==r.id)); }} className="px-3 py-1.5 rounded-full bg-red-500 text-white text-xs">Giải quyết + khóa</button>
                          <button onClick={async()=>{ await fetch("/api/admin/reports",{method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({reportId:r.id, status:"RESOLVED"})}); setReports(prev=>prev.filter(x=>x.id!==r.id)); }} className="px-3 py-1.5 rounded-full bg-emerald-600 text-white text-xs">Đã xử lý</button>
                          <button onClick={async()=>{ await fetch("/api/admin/reports",{method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({reportId:r.id, status:"DISMISSED"})}); setReports(prev=>prev.filter(x=>x.id!==r.id)); }} className="px-3 py-1.5 rounded-full bg-white border text-xs">Bỏ qua</button>
                        </div>
                      )}
                    </div>
                  ))}
                  {reports.length===0 && <div className="text-sm text-[#B08A95] p-4 text-center">Không có báo cáo</div>}
                </div>
              </div>
            )}

            {tab==="questions" && (
              <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
                <div className="rounded-2xl border border-[#FCE8EC] bg-white p-4 space-y-3">
                  <h3 className="font-semibold">{(t.admin as any).questionsView.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    <input type="date" value={dqDate} onChange={(e)=>setDqDate(e.target.value)} className="h-10 rounded-xl border border-[#FCE8EC] px-3 text-sm" />
                    <input value={dqQuestion} onChange={(e)=>setDqQuestion(e.target.value)} placeholder={(t.admin as any).questionsView.placeholder} className="flex-1 min-w-[200px] h-10 rounded-xl border border-[#FCE8EC] px-3 text-sm" />
                    <button onClick={async()=>{ if(!dqQuestion.trim()) return toast((t.admin as any).questionsView.placeholder, "error"); await fetch("/api/admin/daily-questions",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({date:dqDate, question:dqQuestion})}); setDqQuestion(""); const r=await fetch("/api/admin/daily-questions").then(x=>x.json()); setDqList(r.questions??[]); toast("Đã lưu", "success"); }} className="px-5 h-10 rounded-full bg-[#2E1A22] text-white text-sm font-semibold">{(t.admin as any).questionsView.save}</button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                  {dqList.map((q:any)=>(
                    <div key={q.id} className="flex items-center gap-3 rounded-2xl border border-[#FCE8EC] bg-white p-3">
                      <span className="text-xs font-mono bg-[#FFF0F3] border border-[#FCE8EC] px-2 py-1 rounded-full">{q.date}</span>
                      <span className="flex-1 text-sm">{q.question}</span>
                      <button onClick={async()=>{ const ok = await confirm({ title: (t.admin as any).questionsView.deleteConfirm, variant: "danger", confirmText: (t.admin as any).questionsView.delete, cancelText: t.common.cancel }); if(!ok) return; await fetch(`/api/admin/daily-questions?date=${q.date}`,{method:"DELETE"}); setDqList(prev=>prev.filter(x=>x.id!==q.id)); toast("Đã xóa", "success");}} className="text-xs text-red-600 underline">{(t.admin as any).questionsView.delete}</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab==="moderation" && (
              <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
                <div className="flex gap-2">
                  {[
                    ["photos","Ảnh"],
                    ["prompts","Prompt"],
                    ["verification","Xác minh"],
                  ].map(([k,l])=>(
                    <button key={k} onClick={()=>setModType(k)} className={`px-4 py-2 rounded-full text-xs font-semibold border ${modType===k?"bg-[#2E1A22] text-white border-[#2E1A22]":"bg-white border-[#FCE8EC]"}`}>{l}</button>
                  ))}
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                  {modType==="photos" && (modData?.photos ?? []).map((p:any)=>(
                    <div key={p.id} className="flex gap-3 rounded-2xl border border-[#FCE8EC] bg-white p-3">
                      <img src={p.url} alt="" className="w-16 h-20 rounded-xl object-cover border border-[#FCE8EC]" />
                      <div className="flex-1 min-w-0"><div className="text-xs text-[#B08A95]">{p.user?.email} · {fmtDate(p.createdAt)}</div><div className="text-xs mt-1">Trạng thái: {p.status}</div></div>
                      <div className="flex flex-col gap-1">
                        <button onClick={async()=>{ await fetch("/api/admin/moderation",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({type:"photo", id:p.id, action:"APPROVE"})}); setModData((d:any)=>({...d, photos:d.photos.filter((x:any)=>x.id!==p.id)}));}} className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs">Duyệt</button>
                        <button onClick={async()=>{ await fetch("/api/admin/moderation",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({type:"photo", id:p.id, action:"REJECT"})}); setModData((d:any)=>({...d, photos:d.photos.filter((x:any)=>x.id!==p.id)}));}} className="px-3 py-1 rounded-full bg-red-500 text-white text-xs">Từ chối</button>
                      </div>
                    </div>
                  ))}
                  {modType==="prompts" && (modData?.prompts ?? []).map((pa:any)=>(
                    <div key={pa.id} className="rounded-2xl border border-[#FCE8EC] bg-white p-3">
                      <div className="text-xs text-[#B08A95]">{pa.user?.email} · {fmtDate(pa.createdAt)}</div>
                      <div className="text-[11px] font-mono text-[#FF4D6D] mt-1">{pa.question}</div><div className="text-sm mt-1">{pa.answer}</div>
                      <div className="flex gap-2 mt-2">
                        <button onClick={async()=>{ await fetch("/api/admin/moderation",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({type:"prompt", id:pa.id, action:"APPROVE"})}); setModData((d:any)=>({...d, prompts:d.prompts.filter((x:any)=>x.id!==pa.id)}));}} className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs">Duyệt</button>
                        <button onClick={async()=>{ await fetch("/api/admin/moderation",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({type:"prompt", id:pa.id, action:"REJECT"})}); setModData((d:any)=>({...d, prompts:d.prompts.filter((x:any)=>x.id!==pa.id)}));}} className="px-3 py-1 rounded-full bg-red-500 text-white text-xs">Xóa</button>
                      </div>
                    </div>
                  ))}
                  {modType==="verification" && (modData?.verificationRequests ?? []).map((v:any)=>(
                    <div key={v.id} className="flex gap-3 rounded-2xl border border-[#FCE8EC] bg-white p-3">
                      <img src={v.photoUrl} alt="" className="w-20 h-20 rounded-xl object-cover border" />
                      <div className="flex-1"><div className="text-sm font-medium">{v.user?.email} · {v.user?.profile?.firstName}</div><div className="text-xs text-[#B08A95]">{fmtDate(v.createdAt)}</div></div>
                      <div className="flex flex-col gap-1">
                        <button onClick={async()=>{ await fetch("/api/admin/moderation",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({type:"verification", id:v.id, action:"APPROVE"})}); setModData((d:any)=>({...d, verificationRequests:d.verificationRequests.filter((x:any)=>x.id!==v.id)}));}} className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs">Duyệt ✓</button>
                        <button onClick={async()=>{ await fetch("/api/admin/moderation",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({type:"verification", id:v.id, action:"REJECT"})}); setModData((d:any)=>({...d, verificationRequests:d.verificationRequests.filter((x:any)=>x.id!==v.id)}));}} className="px-3 py-1 rounded-full bg-white border text-xs">Từ chối</button>
                      </div>
                    </div>
                  ))}
                  {!modData && <div className="text-sm text-[#B08A95]">Đang tải...</div>}
                </div>
              </div>
            )}

            {tab==="verification" && (
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                {verifs.map((v:any)=>(
                  <div key={v.id} className="flex gap-3 rounded-2xl border border-[#FCE8EC] bg-white p-4">
                    <img src={v.photoUrl} alt="" className="w-20 h-24 rounded-xl object-cover border" />
                    <div className="flex-1"><div className="font-medium text-sm">{v.user?.profile?.firstName} · {v.user?.email}</div><div className="text-xs text-[#B08A95]">{fmtDate(v.createdAt)}</div></div>
                    <div className="flex flex-col gap-2">
                      <button onClick={async()=>{await fetch("/api/admin/verification",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({requestId:v.id, action:"APPROVE"})}); setVerifs(p=>p.filter(x=>x.id!==v.id));}} className="px-4 py-2 rounded-full bg-emerald-600 text-white text-xs">Duyệt</button>
                      <button onClick={async()=>{await fetch("/api/admin/verification",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({requestId:v.id, action:"REJECT"})}); setVerifs(p=>p.filter(x=>x.id!==v.id));}} className="px-4 py-2 rounded-full bg-white border text-xs">Từ chối</button>
                    </div>
                  </div>
                ))}
                {verifs.length===0 && <div className="text-sm text-[#B08A95] text-center py-8">Không có yêu cầu pending</div>}
              </div>
            )}

            {tab==="analytics" && (
              <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
                {!analytics ? <div className="text-sm animate-pulse">Đang tải...</div> : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(analytics.totals as Record<string,number>).map(([k,v])=>(
                        <div key={k} className="rounded-2xl border border-[#FCE8EC] bg-white p-3"><div className="text-xs text-[#B08A95]">{k}</div><div className="text-xl font-semibold">{v as number}</div></div>
                      ))}
                    </div>
                    <div className="rounded-2xl border border-[#FCE8EC] bg-white p-4">
                      <div className="text-sm font-semibold mb-2">7 ngày gần nhất</div>
                      <div className="space-y-1">
                        {analytics.last7.map((d:any)=>(
                          <div key={d.date} className="flex gap-2 text-xs font-mono items-center">
                            <span className="w-[90px]">{d.date}</span>
                            <span className="flex-1 h-2 bg-[#FFF0F3] rounded-full overflow-hidden flex">
                              <span className="bg-[#FF4D6D] h-full" style={{width: `${Math.min(100, d.likes*2)}%`}} />
                            </span>
                            <span className="w-[120px] text-right">{d.likes} likes · {d.matches} matches · {d.messages} msgs</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 text-xs">Tỉ lệ chuyển đổi hôm nay: <span className="font-semibold">{analytics.conversion}%</span> ({analytics.matchesToday}/{analytics.likesToday})</div>
                    </div>
                  </>
                )}
              </div>
            )}

            {tab==="announcements" && (
              <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
                <div className="rounded-2xl border border-[#FCE8EC] bg-white p-4 space-y-2">
                  <input value={annTitle} onChange={(e)=>setAnnTitle(e.target.value)} placeholder="Tiêu đề thông báo..." className="w-full h-10 rounded-xl border border-[#FCE8EC] px-3 text-sm" />
                  <textarea value={annBody} onChange={(e)=>setAnnBody(e.target.value)} rows={2} placeholder="Nội dung..." className="w-full rounded-xl border border-[#FCE8EC] p-3 text-sm" />
                  <button onClick={async()=>{ if(!annTitle.trim()||!annBody.trim()) return; await fetch("/api/admin/announcements",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({title:annTitle, body:annBody})}); setAnnTitle(""); setAnnBody(""); const r=await fetch("/api/admin/announcements").then(x=>x.json()); setAnnouncements(r.announcements??[]);}} className="px-5 h-10 rounded-full bg-[#2E1A22] text-white text-sm">Gửi thông báo tới tất cả</button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                  {announcements.map((a:any)=>(
                    <div key={a.id} className="rounded-2xl border border-[#FCE8EC] bg-white p-3">
                      <div className="font-semibold text-sm">{a.title} {a.isActive ? <span className="text-emerald-600 text-xs">· đang hoạt động</span> : <span className="text-[#B08A95] text-xs">· ẩn</span>}</div>
                      <div className="text-sm text-[#6E4A56] mt-1">{a.body}</div>
                      <div className="text-xs text-[#B08A95] mt-1">{fmtDate(a.createdAt)}</div>
                      <button onClick={()=>toggleAnnouncement(a)} className="mt-2 text-xs underline">{a.isActive ? "Ẩn" : "Hiện"}</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab==="config" && (
              <div className="flex-1 min-h-0 flex flex-col gap-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(config).map(([k,v])=>(
                    <div key={k} className="rounded-2xl border border-[#FCE8EC] bg-white p-3"><div className="text-xs font-mono text-[#B08A95]">{k}</div><div className="font-semibold">{v}</div></div>
                  ))}
                </div>
                <div className="rounded-2xl border border-[#FCE8EC] bg-white p-4 flex flex-wrap gap-2">
                  <select value={configKey} onChange={(e)=>{setConfigKey(e.target.value); setConfigVal(config[e.target.value] ?? "")}} className="h-10 rounded-xl border border-[#FCE8EC] px-3 text-sm">
                    <option value="DAILY_LIMIT">DAILY_LIMIT</option>
                    <option value="SLOW_LIMIT">SLOW_LIMIT</option>
                    <option value="STAMPS_PER_WEEK">STAMPS_PER_WEEK</option>
                  </select>
                  <input value={configVal} onChange={(e)=>setConfigVal(e.target.value)} className="h-10 rounded-xl border border-[#FCE8EC] px-3 text-sm flex-1 min-w-[100px]" />
                  <button onClick={async()=>{ await fetch("/api/admin/config",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({key:configKey, value:configVal})}); setConfig(prev=>({...prev, [configKey]:configVal}));}} className="px-5 h-10 rounded-full bg-[#2E1A22] text-white text-sm">Lưu cấu hình</button>
                </div>
                <div className="text-xs text-[#B08A95] bg-[#FFFCFA] border border-[#FCE8EC] rounded-xl p-3">DAILY_LIMIT: số bưu thiếp/ngày, SLOW_LIMIT: số tin nhắn/24h cho match mới, STAMPS_PER_WEEK: tem ưu tiên.</div>
              </div>
            )}

            {tab==="audit" && (
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                {audit.map((a:any)=>(
                  <div key={a.id} className="rounded-2xl border border-[#FCE8EC] bg-white p-3">
                    <div className="flex flex-wrap gap-2 text-sm"><span className="font-semibold bg-[#2E1A22] text-white px-2 py-1 rounded-full text-xs">{a.action}</span><span className="text-xs text-[#B08A95] ml-auto">{fmtDate(a.createdAt)}</span></div>
                    <div className="text-xs mt-1">Admin: {a.admin?.email} → Target: {a.target?.email ?? a.targetId ?? "—"}</div>
                    {a.reason && <div className="text-xs text-[#6E4A56] mt-1">Lý do: {a.reason}</div>}
                    {a.metadata && <div className="text-[11px] font-mono bg-[#FFFCFA] border border-[#FCE8EC] p-2 rounded-xl mt-1 truncate">{a.metadata}</div>}
                  </div>
                ))}
                {audit.length===0 && <div className="text-sm text-[#B08A95] text-center py-8">Chưa có log</div>}
              </div>
            )}

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
                          <div className="font-semibold text-[#2E1A22] text-lg">{detail.user.profile.firstName} <span className="text-sm font-normal text-[#8E6B75]">{detail.user.profile.gender} · {detail.user.profile.location ?? "—"}</span> {(detail.user as any).isVerified && <span className="text-[#1DA1F2] text-sm">✓</span>}</div>
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
