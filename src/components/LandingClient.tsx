"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export default function LandingClient() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function demoLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    await signIn("credentials", { email, callbackUrl: "/discover" });
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FDF8F4]">
      <div className="flex-1 grid md:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col p-8 md:p-12 lg:p-16 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#1A1A1E] flex items-center justify-center text-white font-mono text-[11px]">Lm</div>
            <div>
              <div className="font-display text-xl leading-none tracking-tight">Lumen</div>
              <div className="text-[10px] font-mono tracking-[0.14em] uppercase text-[#6B6B6B]">Letters, not swipes</div>
            </div>
          </div>

          <div className="max-w-[520px] mx-auto w-full flex flex-col gap-8 py-12">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#E8DDD3] bg-[#FFFCF8] text-[11px] font-mono tracking-widest uppercase text-[#6B6B6B]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C96442] animate-pulse" /> Không vuốt · Chỉ đọc
              </div>
              <h1 className="font-display text-[42px] md:text-[52px] font-[400] tracking-[-0.03em] leading-[0.9]">
                Tình cảm<br />
                <span className="italic font-[300]">viết chậm.</span>
              </h1>
              <p className="text-[#6B6B6B] leading-relaxed text-[15px] max-w-[44ch]">
                Mỗi ngày 20 bưu thiếp. Mỗi bưu thiếp là một lá thư tay — ảnh, lời tự sự, và một câu hỏi chung. Không có nút thả tim trống. Muốn kết nối, bạn phải viết một dòng thật lòng.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-full bg-[#1A1A1E] text-white font-mono">20 / ngày</span>
                <span className="px-2.5 py-1 rounded-full border border-[#E8DDD3] bg-white">Kèm lời nhắn mới được thích</span>
                <span className="px-2.5 py-1 rounded-full border border-[#E8DDD3] bg-white">Voice 15s + Prompt</span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => signIn("google", { callbackUrl: "/discover" })}
                className="w-full h-12 rounded-full border border-[#E8DDD3] bg-white hover:bg-[#F2EDE8] flex items-center justify-center gap-3 font-medium text-sm transition"
              >
                <span className="w-5 h-5 rounded-full bg-[#4285F4] text-white grid place-items-center text-[10px] font-bold">G</span>
                Tiếp tục với Google
              </button>
              <button
                onClick={() => signIn("apple", { callbackUrl: "/discover" })}
                className="w-full h-12 rounded-full bg-[#1A1A1E] text-white hover:bg-black flex items-center justify-center gap-3 font-medium text-sm transition"
              >
                <span className="text-lg"></span> Tiếp tục với Apple
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#E8DDD3]" /></div>
                <div className="relative flex justify-center"><span className="bg-[#FDF8F4] px-3 text-xs font-mono text-[#9A9A9A]">hoặc tạo tài khoản ngay</span></div>
              </div>

              <form onSubmit={demoLogin} className="flex gap-2">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="demo@lumen.app"
                  type="email"
                  className="flex-1 h-12 rounded-full border border-[#E8DDD3] bg-white px-5 text-sm outline-none focus:border-[#C96442] placeholder:text-[#9A9A9A]"
                />
                <button disabled={loading} className="h-12 px-6 rounded-full bg-[#C96442] text-white font-medium text-sm hover:bg-[#A84E32] disabled:opacity-50">
                  {loading ? "..." : "Vào"}
                </button>
              </form>
              <p className="text-[11px] font-mono text-[#9A9A9A] text-center">Không cần mật khẩu</p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                ["01", "Mở thư", "Ảnh mờ, mở mới rõ"],
                ["02", "Chọn một dòng", "Chạm prompt để trả lời"],
                ["03", "Gửi bưu thiếp", "Kèm lời nhắn 6-140 ký tự"],
              ].map(([n, t, d]) => (
                <div key={n} className="rounded-2xl border border-[#E8DDD3] bg-[#FFFCF8] p-4">
                  <div className="font-mono text-[10px] tracking-widest text-[#C96442]">{n}</div>
                  <div className="text-xs font-medium mt-1">{t}</div>
                  <div className="text-[11px] text-[#6B6B6B] leading-snug mt-1">{d}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4 text-xs font-mono text-[#9A9A9A] justify-center md:justify-start">
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <Link href="/terms" className="hover:underline">Terms</Link>
            <Link href="/community-guidelines" className="hover:underline">Guidelines</Link>
          </div>
        </div>

        <div className="hidden md:flex relative bg-[#F2EDE8] p-8 items-center justify-center overflow-hidden border-l border-[#E8DDD3]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_30%,rgba(201,100,66,0.12),transparent_50%)]" />
          <div className="relative w-[380px] space-y-4 rotate-[-0.5deg]">
            <div className="paper-card rounded-[20px] overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-[0.14em] uppercase text-[#C96442]">Bưu thiếp #07 — Hôm nay</span>
                <span className="text-[10px] font-mono text-[#9A9A9A]">20 · Q&A</span>
              </div>
              <div className="h-[280px] bg-[#E8DDD3] relative mx-5 rounded-2xl overflow-hidden">
                <img src="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&h=800&fit=crop" alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1E]/60 to-transparent" />
                <div className="absolute bottom-0 p-4 text-white">
                  <div className="font-display text-lg leading-none">Maya, 26</div>
                  <div className="text-xs font-mono opacity-80 mt-1">2 km · Thích cà phê & hiking</div>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <div className="rounded-2xl border border-[#E8DDD3] p-3 bg-[#FDF8F4]">
                  <div className="text-[10px] font-mono tracking-widest uppercase text-[#C96442]">Điều khiến mình tò mò gần đây</div>
                  <div className="font-display text-sm leading-snug mt-1">Cách người ta giữ thói quen viết tay mỗi sáng.</div>
                </div>
                <div className="flex gap-1.5">
                  <span className="px-2.5 py-1 rounded-full bg-[#F2EDE8] border border-[#E8DDD3] text-xs">Yoga</span>
                  <span className="px-2.5 py-1 rounded-full bg-[#F2EDE8] border border-[#E8DDD3] text-xs">Photography</span>
                  <span className="px-2.5 py-1 rounded-full bg-[#1A1A1E] text-white text-xs">Gửi lời nhắn →</span>
                </div>
              </div>
            </div>
            <div className="paper-card rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#C96442] grid place-items-center text-white text-xs">✦</div>
              <div className="text-sm">
                <div className="font-medium">Đã kết nối — kèm lời nhắn</div>
                <div className="text-xs text-[#6B6B6B]">“Mình cũng viết mỗi sáng, 7h ở Thảo Điền...”</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
