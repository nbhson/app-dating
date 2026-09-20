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

  if (loading) return <div className="p-8 text-sm text-zinc-500">Loading admin...</div>;

  return (
    <div className="min-h-screen flex">
      <Nav />
      <main className="flex-1 p-6 md:p-8 space-y-6 bg-[#fffafb]">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ["Total users", data.totalUsers],
            ["Active", data.activeUsers],
            ["New today", data.newToday],
            ["Matches today", data.matchesToday],
            ["Messages today", data.messagesToday],
            ["Reports today", data.reportsToday],
            ["Discover views today", data.discoveryToday],
          ].map(([label, v]) => (
            <div key={label as string} className="bg-white rounded-2xl border p-4">
              <div className="text-xs text-zinc-500">{label}</div>
              <div className="text-2xl font-semibold">{v as number}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border p-4">
            <h2 className="font-medium mb-3">Recent users</h2>
            <div className="space-y-2">
              {data.recentUsers.map((u: any) => (
                <div key={u.id} className="flex items-center justify-between text-sm border rounded-xl px-3 py-2">
                  <div>
                    <div className="font-medium">{u.profile?.firstName ?? u.name ?? u.email} <span className="text-xs text-zinc-500">{u.status}</span></div>
                    <div className="text-xs text-zinc-500">{u.email}</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => fetch("/api/admin/stats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId: u.id, action: "SUSPEND" }) }).then(() => location.reload())} className="text-xs border rounded-full px-2 py-1">Suspend</button>
                    <button onClick={() => fetch("/api/admin/stats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId: u.id, action: "ACTIVATE" }) }).then(() => location.reload())} className="text-xs border rounded-full px-2 py-1">Activate</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border p-4">
            <h2 className="font-medium mb-3">Recent reports</h2>
            <div className="space-y-2">
              {data.recentReports.length === 0 ? <div className="text-sm text-zinc-500">No reports</div> : data.recentReports.map((r: any) => (
                <div key={r.id} className="text-sm border rounded-xl px-3 py-2">
                  <div className="font-medium">{r.reason} <span className="text-xs text-zinc-500">{r.status}</span></div>
                  <div className="text-xs text-zinc-500">Reporter: {r.reporter.email} → Reported: {r.reported.email}</div>
                  <div className="text-xs">{r.details}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
