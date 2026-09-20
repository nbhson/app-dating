"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n/context";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function LandingClient() {
  const { t, trans } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function demoLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError(t.landing.invalidCredentials);
      return;
    }
    if (password.length < 8) {
      setError((t.landing as any).passwordTooShort || "Mật khẩu phải ít nhất 8 ký tự");
      return;
    }
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError((t.landing as any).invalidCredentials || "Sai email hoặc mật khẩu");
    } else if (res?.ok) {
      window.location.href = "/discover";
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col relative overflow-x-hidden overflow-y-auto bg-[#FFF7F5]">
      {/* soft aura orbs behind — now with YT-inspired drift adapted for dating */}
      <div className="aura aura-peach w-[520px] h-[520px] -top-24 -left-24 opacity-40 animate-aura-drift pointer-events-none" />
      <div className="aura aura-lavender w-[700px] h-[500px] top-0 right-0 opacity-40 animate-aura-drift-slow pointer-events-none" />

      <div className="flex-1 grid lg:grid-cols-[1.05fr_0.95fr] max-w-[1280px] mx-auto w-full relative">
        {/* LEFT */}
        <div className="flex flex-col p-6 sm:p-8 md:p-10 lg:p-12 xl:p-14 gap-6 lg:gap-8 relative">
          {/* header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center text-white shadow-[0_8px_20px_rgba(255,77,109,0.3)]">
              <span className="text-[18px] leading-none -mt-0.5">♥</span>
            </div>
            <div>
              <div className="font-display text-[20px] leading-none font-semibold tracking-tight">{t.common.appName}</div>
              <div className="text-[10px] font-mono tracking-[0.16em] uppercase text-[#8E6B75]">{t.common.tagline}</div>
            </div>
            <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-[11px] font-medium text-[#8E6B75]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D6D] animate-pulse-soft" /> {t.landing.onlineNow}
            </span>
            <LanguageSwitcher variant="compact" className="ml-1 hidden sm:inline-flex" />
          </div>

          <div className="max-w-[560px] mx-auto w-full flex flex-col gap-5 lg:gap-6 py-2 lg:py-4">
            {/* pill */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex self-start items-center gap-2.5 px-4 py-2 rounded-full glass text-[12px] font-medium text-[#6E4A56]"
            >
              <span className="w-7 h-7 rounded-full gradient-primary grid place-items-center text-white text-[11px] shadow-sm">✦</span>
              {t.landing.badge}
              <span className="hidden sm:inline w-px h-4 bg-[#F3DDE2] ml-1" />
              <span className="hidden sm:inline text-[#FF4D6D] font-semibold">{t.landing.badgeSub}</span>
            </motion.div>

            <div className="space-y-5">
              <h1 className="font-display text-[42px] sm:text-[48px] lg:text-[56px] font-[300] tracking-[-0.04em] leading-[0.88] text-[#2E1A22]">
                {t.landing.title1}
                <br />
                <span className="font-[400] italic text-gradient">{t.landing.title2}</span>
              </h1>
              <p className="text-[#8E6B75] leading-relaxed text-[15.5px] max-w-[46ch] font-[400]">
                {t.landing.desc}
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3.5 py-2 rounded-full gradient-primary text-white text-xs font-semibold shadow-[0_4px_16px_rgba(255,77,109,0.25)]">{t.landing.perDay}</span>
                <span className="px-3.5 py-2 rounded-full glass text-xs font-medium text-[#6E4A56]">{t.landing.needMessage}</span>
                <span className="px-3.5 py-2 rounded-full glass text-xs font-medium text-[#6E4A56] flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#FF4D6D] animate-pulse" /> {t.landing.voice}</span>
              </div>
            </div>

            <div className="space-y-3.5">
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => signIn("google", { callbackUrl: "/discover" })}
                className="w-full h-[52px] rounded-full glass-strong hover:shadow-[0_8px_24px_rgba(46,26,34,0.08)] flex items-center justify-center gap-3 font-medium text-[14px] transition text-[#2E1A22]"
              >
                <span className="w-6 h-6 rounded-full bg-white border border-[#F3DDE2] grid place-items-center shadow-sm">
                  <span className="w-3 h-3 rounded-full bg-[conic-gradient(from_0deg,#4285F4_0_25%,#EA4335_25%_50%,#FBBC05_50%_75%,#34A853_75%_100%)]" />
                </span>
                {t.landing.continueGoogle}
              </motion.button>
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => signIn("apple", { callbackUrl: "/discover" })}
                className="w-full h-[52px] rounded-full bg-[#2E1A22] text-white hover:bg-[#1F1218] flex items-center justify-center gap-2.5 font-medium text-[14px] transition shadow-[0_8px_24px_rgba(46,26,34,0.18)]"
              >
                <span className="text-[17px] -mt-0.5"></span> {t.landing.continueApple}
              </motion.button>

              <div className="relative py-3">
                <div className="absolute inset-0 flex items-center"><div className="w-full h-px bg-gradient-to-r from-transparent via-[#F3DDE2] to-transparent" /></div>
                <div className="relative flex justify-center"><span className="bg-[#FFF7F5] px-4 text-xs font-mono text-[#B08A95] rounded-full border border-[#FCE8EC] py-1">{t.landing.orQuick}</span></div>
              </div>

              <form onSubmit={demoLogin} className="space-y-2">
                <div className="flex flex-col gap-2 p-1.5 rounded-[28px] glass-strong">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={(t.landing as any).emailPlaceholder || "demo@lumen.app"}
                    type="email"
                    required
                    className="w-full h-11 rounded-full bg-white/80 border border-[#FCE8EC] px-5 text-sm outline-none focus:border-[#FF8FA3] focus:bg-white placeholder:text-[#B08A95] transition"
                  />
                  <div className="flex gap-2">
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={(t.landing as any).passwordPlaceholder || "Mật khẩu (tối thiểu 8 ký tự)"}
                      type="password"
                      required
                      minLength={8}
                      className="flex-1 h-11 rounded-full bg-white/80 border border-[#FCE8EC] px-5 text-sm outline-none focus:border-[#FF8FA3] focus:bg-white placeholder:text-[#B08A95] transition"
                    />
                    <button disabled={loading} className="h-11 px-7 rounded-full btn-primary font-semibold text-sm shrink-0 disabled:opacity-50">
                      {loading ? "…" : t.landing.enter}
                    </button>
                  </div>
                </div>
                {error && <p className="text-xs text-[#FF4D6D] text-center font-medium">{error}</p>}
                <p className="text-[11px] font-mono text-[#B08A95] text-center tracking-wide">{(t.landing as any).passwordHint || t.landing.noPassword}</p>
              </form>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                ["01", t.landing.step1Title, t.landing.step1Desc, "✉️"],
                ["02", t.landing.step2Title, t.landing.step2Desc, "💬"],
                ["03", t.landing.step3Title, t.landing.step3Desc, "💌"],
              ].map(([n, title, desc, icon]) => (
                <div key={n} className="rounded-[16px] glass p-3 sm:p-4 text-center group hover:shadow-[0_8px_24px_rgba(46,26,34,0.06)] transition">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full gradient-primary-soft border border-[#FCE8EC] grid place-items-center mx-auto text-[12px] sm:text-[14px]">{icon}</div>
                  <div className="font-mono text-[9px] sm:text-[10px] tracking-[0.14em] text-[#FF8FA3] mt-2 sm:mt-2.5 font-semibold">{n}</div>
                  <div className="text-[12px] sm:text-[13px] font-semibold mt-1 text-[#2E1A22]">{title}</div>
                  <div className="text-[10.5px] sm:text-[11.5px] text-[#8E6B75] leading-snug mt-1">{desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4 text-xs font-mono text-[#B08A95] justify-center lg:justify-start">
            <Link href="/privacy" className="hover:text-[#2E1A22] transition">{t.common.privacy}</Link>
            <span className="opacity-30">·</span>
            <Link href="/terms" className="hover:text-[#2E1A22] transition">{t.common.terms}</Link>
            <span className="opacity-30">·</span>
            <Link href="/community-guidelines" className="hover:text-[#2E1A22] transition">{t.common.guidelines}</Link>
          </div>
        </div>

        {/* RIGHT - preview */}
        <div className="hidden lg:flex relative items-center justify-center p-8 xl:p-10 overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FFF0F3] via-[#FFF7F5] to-[#F3EFFF]" />
            <div className="aura aura-peach w-[420px] h-[420px] top-12 right-12 animate-aura-drift" />
            <div className="aura aura-lavender w-[520px] h-[520px] bottom-0 left-8 animate-aura-drift-slow" />
            <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />
          </div>

          <div className="relative w-[380px] xl:w-[400px] space-y-5">
            {/* floating hearts */}
            <div className="absolute -top-6 -right-2 text-[#FF8FA3] text-xl animate-float opacity-60">♥</div>
            <div className="absolute top-32 -left-6 text-[#E8DEFF] text-2xl animate-float-2 opacity-50">✦</div>
            <div className="absolute bottom-20 -right-4 text-[#FFB5A7] text-lg animate-float opacity-40">♥</div>

            <motion.div
              initial={{ y: 12, opacity: 0, rotate: -0.8 }}
              animate={{ y: 0, opacity: 1, rotate: -0.6 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="glass-strong rounded-[32px] overflow-hidden animate-float"
            >
              <div className="px-6 pt-6 pb-3 flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-[0.14em] uppercase text-[#FF4D6D] font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D6D] animate-pulse-soft" /> {t.landing.previewBadge}
                </span>
                <span className="text-[11px] font-mono text-[#B08A95] bg-[#FFF0F3] border border-[#FCE8EC] px-2.5 py-1 rounded-full">20 · Q&A</span>
              </div>
              <div className="h-[300px] bg-[#FFE8EC] relative mx-6 rounded-[24px] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                <img src="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&h=800&fit=crop" alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2E1A22]/75 via-[#2E1A22]/10 to-transparent" />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/85 backdrop-blur text-[11px] font-medium text-[#2E1A22] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Online
                </div>
                <div className="absolute bottom-0 p-5 text-white w-full">
                  <div className="font-display text-[20px] leading-none font-medium">Maya, 26</div>
                  <div className="text-xs font-medium opacity-90 mt-1.5 flex items-center gap-2">
                    <span>2 km · Thích cà phê & hiking</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur border border-white/30 text-[10px]">INTJ · Yêu thư tay</span>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-3.5">
                <div className="rounded-[20px] bg-gradient-to-br from-[#FFF0F3] to-[#FFF7F5] border border-[#FCE8EC] p-4 relative overflow-hidden">
                  <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-[#FF8FA3]/10 blur-xl" />
                  <div className="text-[10px] font-mono tracking-[0.14em] uppercase text-[#FF4D6D] font-semibold">Điều khiến mình tò mò gần đây</div>
                  <div className="font-display text-[15px] leading-snug mt-1.5 text-[#2E1A22]">Cách người ta giữ thói quen viết tay mỗi sáng — mình muốn học điều đó.</div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-3 py-1.5 rounded-full bg-[#FFF0F3] border border-[#FCE8EC] text-xs font-medium text-[#6E4A56]">🧘 Yoga</span>
                  <span className="px-3 py-1.5 rounded-full bg-[#FFF0F3] border border-[#FCE8EC] text-xs font-medium text-[#6E4A56]">📸 Photography</span>
                  <span className="px-3.5 py-1.5 rounded-full gradient-primary text-white text-xs font-semibold shadow-sm">Gửi lời nhắn →</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="glass rounded-[24px] p-4 flex items-center gap-3.5 shadow-[0_8px_32px_rgba(46,26,34,0.08)]"
            >
              <div className="w-11 h-11 rounded-full gradient-primary grid place-items-center text-white text-sm shadow-[0_4px_12px_rgba(255,77,109,0.3)] shrink-0">♥</div>
              <div className="text-sm flex-1 min-w-0">
                <div className="font-semibold text-[#2E1A22]">{t.landing.connected}</div>
                <div className="text-xs text-[#8E6B75] truncate">{t.landing.previewMsg}</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white grid place-items-center text-xs shrink-0">✓</div>
            </motion.div>

            <div className="flex justify-center gap-1.5 pt-2">
              <span className="w-6 h-1.5 rounded-full bg-[#FF4D6D]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#F3DDE2]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#F3DDE2]" />
            </div>
          </div>
        </div>
      </div>

      {/* footer aura bottom */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[#F3DDE2] to-transparent" />
    </div>
  );
}
