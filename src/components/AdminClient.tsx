"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";

export default function AdminClient({ isAdmin }: { isAdmin: boolean }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex">
        <Nav />
        <div className="flex-1 grid place-items-center p-8">
          <div className="max-w-md w-full bg-white rounded-2xl border p-8 text-center space-y-3">
            <h1 className="text-xl font-semibold">Admin access required</h1>
            <p className="text-sm text-zinc-600">Your account is not an admin. Run the seed script or manually set isAdmin=true in database.</p>
            <code className="block bg-zinc-100 p-3 rounded-xl text-xs text-left">UPDATE User SET isAdmin=1 WHERE email=&apos;your@email.com&apos;;</code>
            <Link href="/discover" className="inline-flex h-11 px-6 rounded-full bg-zinc-900 text-white items-center text-sm">Back to app</Link>
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
              <div className="text-sm font-mono text-[#8E6B75] animate-pulse">Loading admin dashboard...</div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen md:h-[100dvh] flex overflow-hidden">
      <Nav />
      <main className="flex-1 min-w-0 overflow-hidden p-4 sm:p-6 md:p-6 lg:p-8">
        <div className="h-full min-h-0 max-w-[1200px] mx-auto w-full rounded-[24px] md:rounded-[28px] glass-strong border border-white/70 p-4 sm:p-5 md:p-6 lg:p-7 shadow-[0_12px_40px_rgba(46,26,34,0.08)] overflow-hidden flex flex-col gap-3 md:gap-5">
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-[24px] md:text-[30px] font-medium text-[#2E1A22]">Admin Dashboard</h1>
            <span className="text-[11px] md:text-xs font-mono text-[#B08A95] bg-[#FFF0F3] border border-[#FCE8EC] rounded-full px-2.5 md:px-3 py-1">Moderation & stats</span>
          </div>

          <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-4">
            {[
              ["Total users", data.totalUsers],
              ["Active", data.activeUsers],
              ["New today", data.newToday],
              ["Matches today", data.matchesToday],
              ["Messages today", data.messagesToday],
              ["Reports today", data.reportsToday],
              ["Discover views today", data.discoveryToday],
            ].map(([label, v]) => (
              <div key={label as string} className="rounded-[18px] md:rounded-[20px] border border-[#FCE8EC] bg-white/85 p-3 md:p-4 shadow-[0_4px_16px_rgba(46,26,34,0.05)]">
                <div className="text-[11px] md:text-xs text-[#8E6B75]">{label}</div>
                <div className="text-lg md:text-2xl font-semibold text-[#2E1A22] mt-1">{v as number}</div>
              </div>
            ))}
          </div>

          <div className="flex-1 min-h-0 grid md:grid-cols-2 gap-3 md:gap-5">
            <div className="h-full min-h-0 rounded-[20px] md:rounded-[24px] border border-[#FCE8EC] bg-white/85 p-3.5 md:p-5 shadow-[0_4px_16px_rgba(46,26,34,0.05)] overflow-hidden flex flex-col">
              <h2 className="shrink-0 font-medium mb-2.5 md:mb-3 text-[#2E1A22]">Recent users</h2>
              <div className="flex-1 min-h-0 space-y-2 overflow-y-auto pr-1">
                {data.recentUsers.map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between text-sm rounded-[16px] border border-[#FCE8EC] bg-white px-3 py-2">
                    <div className="min-w-0">
                      <div className="font-medium text-[#2E1A22] truncate">{u.profile?.firstName ?? u.name ?? u.email} <span className="text-xs text-[#B08A95] ml-1">{u.status}</span></div>
                      <div className="text-xs text-[#B08A95] truncate">{u.email}</div>
                    </div>
                    <div className="flex gap-1 shrink-0 ml-3">
                      <button onClick={() => fetch("/api/admin/stats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId: u.id, action: "SUSPEND" }) }).then(() => location.reload())} className="text-xs border border-amber-200 bg-amber-50 text-amber-700 rounded-full px-2.5 py-1 hover:bg-amber-100">Suspend</button>
                      <button onClick={() => fetch("/api/admin/stats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId: u.id, action: "ACTIVATE" }) }).then(() => location.reload())} className="text-xs border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-full px-2.5 py-1 hover:bg-emerald-100">Activate</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-full min-h-0 rounded-[20px] md:rounded-[24px] border border-[#FCE8EC] bg-white/85 p-3.5 md:p-5 shadow-[0_4px_16px_rgba(46,26,34,0.05)] overflow-hidden flex flex-col">
              <h2 className="shrink-0 font-medium mb-2.5 md:mb-3 text-[#2E1A22]">Recent reports</h2>
              <div className="flex-1 min-h-0 space-y-2 overflow-y-auto pr-1">
                {data.recentReports.length === 0 ? <div className="text-sm text-[#B08A95]">No reports</div> : data.recentReports.map((r: any) => (
                  <div key={r.id} className="text-sm rounded-[16px] border border-[#FCE8EC] bg-white px-3 py-2">
                    <div className="font-medium text-[#2E1A22]">{r.reason} <span className="text-xs text-[#B08A95] ml-1">{r.status}</span></div>
                    <div className="text-xs text-[#B08A95] mt-1">Reporter: {r.reporter.email} → Reported: {r.reported.email}</div>
                    {r.details && <div className="text-xs mt-1 text-[#6E4A56]">{r.details}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
