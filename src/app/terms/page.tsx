"use client";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";

export default function Terms() {
  const { t } = useI18n();
  const p = (t as any).terms as any;
  const s = p.sections;
  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-contain bg-[#FFFCFA] no-scrollbar">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-10 pb-12">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[#8E6B75] hover:text-[#2E1A22] transition">
          <span className="w-8 h-8 rounded-full bg-white border border-[#FCE8EC] grid place-items-center">‹</span> {p.back}
        </Link>
        <div className="mt-6 glass-strong rounded-[28px] border border-white/60 shadow-[0_12px_40px_rgba(46,26,34,0.08)] p-6 md:p-8 space-y-6">
          <div>
            <h1 className="font-display text-[28px] md:text-[32px] font-medium text-[#2E1A22]">{p.title}</h1>
            <p className="text-xs font-mono text-[#B08A95] mt-1">{p.lastUpdated}</p>
            <p className="text-sm text-[#6E4A56] leading-relaxed mt-3">{p.intro}</p>
          </div>
          <div className="h-px bg-[#FCE8EC]" />
          {( [
            [s.eligibilityTitle, s.eligibilityBody],
            [s.conductTitle, s.conductBody],
            [s.contentTitle, s.contentBody],
            [s.safetyTitle, s.safetyBody],
            [s.paymentTitle, s.paymentBody],
            [s.terminationTitle, s.terminationBody],
            [s.disclaimerTitle, s.disclaimerBody],
            [s.changesTitle, s.changesBody],
            [s.lawTitle, s.lawBody],
          ] as [string, string][]).map(([title, body]) => (
            <section key={title} className="space-y-2">
              <h2 className="font-semibold text-[#2E1A22] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D6D]" /> {title}
              </h2>
              <p className="text-sm text-[#6E4A56] leading-relaxed bg-[#FFFCFA]/60 border border-[#FCE8EC]/40 rounded-2xl p-4">{body}</p>
            </section>
          ))}
          <div className="rounded-2xl bg-[#FFF0F3] border border-[#FCE8EC] p-4 flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-[#2E1A22] text-white grid place-items-center text-xs">⚖</span>
            <div className="text-sm">
              <div className="font-semibold text-[#2E1A22]">18+ · Be kind · No harassment</div>
              <div className="text-xs text-[#8E6B75]">Lumen · Letters, not swipes · {p.lastUpdated}</div>
            </div>
            <Link href="/privacy" className="ml-auto px-4 py-2 rounded-full bg-white border border-[#FCE8EC] text-xs font-semibold hover:bg-[#FFF0F3]">Privacy →</Link>
          </div>
        </div>
        <div className="text-center text-xs font-mono text-[#B08A95] mt-6">Lumen · Terms · Letters, not swipes ♥</div>
      </div>
    </div>
  );
}
