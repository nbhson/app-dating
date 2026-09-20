"use client";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";

export default function Guidelines() {
  const { t } = useI18n();
  const g = (t as any).guidelines as any;
  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-contain bg-[#FFFCFA] no-scrollbar">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-10 pb-12">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[#8E6B75] hover:text-[#2E1A22]">
          <span className="w-8 h-8 rounded-full bg-white border border-[#FCE8EC] grid place-items-center">‹</span> {g.back}
        </Link>
        <div className="mt-6 glass-strong rounded-[28px] border border-white/60 shadow-[0_12px_40px_rgba(46,26,34,0.08)] p-6 md:p-8 space-y-6">
          <div>
            <h1 className="font-display text-[28px] font-medium text-[#2E1A22]">{g.title}</h1>
            <p className="text-xs font-mono text-[#B08A95] mt-1">{g.lastUpdated}</p>
            <p className="text-sm text-[#6E4A56] mt-3">{g.intro}</p>
          </div>
          <ul className="space-y-2">
            {g.items.map((it: string, i: number) => (
              <li key={i} className="flex gap-3 text-sm text-[#6E4A56] bg-[#FFFCFA]/60 border border-[#FCE8EC]/40 rounded-2xl p-4">
                <span className="w-7 h-7 rounded-full bg-[#FFF0F3] border border-[#FCE8EC] grid place-items-center text-[#FF4D6D] text-xs shrink-0">{i + 1}</span>
                <span className="leading-relaxed">{it}</span>
              </li>
            ))}
          </ul>
          <div className="rounded-2xl bg-[#2E1A22] text-white p-5 flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-white/15 grid place-items-center">♥</span>
            <div className="text-sm"><div className="font-semibold">Cần hỗ trợ?</div><div className="text-xs text-white/70">Báo cáo / Chặn ngay trong bưu thiếp hoặc hòm thư.</div></div>
            <Link href="/discover" className="ml-auto px-4 py-2 rounded-full bg-white text-[#2E1A22] text-xs font-semibold">Khám phá →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
