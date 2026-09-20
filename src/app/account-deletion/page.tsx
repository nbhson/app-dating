"use client";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";

export default function Deletion() {
  const { t, locale } = useI18n();
  const isVi = locale === "vi";
  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-contain bg-[#FFFCFA] no-scrollbar">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-10 pb-12">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[#8E6B75] hover:text-[#2E1A22]">
          <span className="w-8 h-8 rounded-full bg-white border border-[#FCE8EC] grid place-items-center">‹</span> {isVi ? "← Quay lại" : "← Back"}
        </Link>
        <div className="mt-6 glass-strong rounded-[28px] border border-white/60 shadow-[0_12px_40px_rgba(46,26,34,0.08)] p-6 md:p-8 space-y-6">
          <div>
            <h1 className="font-display text-[28px] font-medium text-[#2E1A22]">{isVi ? "Xóa tài khoản" : "Account Deletion"}</h1>
            <p className="text-sm text-[#6E4A56] mt-2 leading-relaxed">
              {isVi
                ? "Bạn có thể xóa tài khoản bất kỳ lúc nào. Dữ liệu sẽ được ẩn ngay (soft DELETE) và xóa cứng trong vòng 30 ngày theo yêu cầu."
                : "You can delete your account anytime. Data is hidden immediately (soft DELETE) and hard-deleted within 30 days on request."}
            </p>
          </div>
          <div className="grid gap-3">
            <div className="rounded-2xl border border-[#FCE8EC] bg-white p-4 flex gap-3">
              <span className="w-8 h-8 rounded-full bg-[#FFF0F3] border border-[#FCE8EC] grid place-items-center text-sm">1</span>
              <div className="text-sm"><div className="font-semibold">{isVi ? "Trong ứng dụng" : "In app"}</div><div className="text-[#6E4A56]">Profile → {isVi ? "Kéo xuống “Tài khoản → Xóa tài khoản” → nhập email để xác nhận." : "Scroll to “Account → Delete account” → confirm with email."}</div></div>
            </div>
            <div className="rounded-2xl border border-[#FCE8EC] bg-white p-4 flex gap-3">
              <span className="w-8 h-8 rounded-full bg-[#FFF0F3] border border-[#FCE8EC] grid place-items-center text-sm">2</span>
              <div className="text-sm"><div className="font-semibold">Email</div><div className="text-[#6E4A56]">{isVi ? "Gửi email tới support@lumen.app với tiêu đề “Delete my account — ” + email của bạn." : "Email support@lumen.app with subject “Delete my account — ” + your email."}</div></div>
            </div>
            <div className="rounded-2xl border border-[#FCE8EC] bg-white p-4 flex gap-3">
              <span className="w-8 h-8 rounded-full bg-[#FFF0F3] border border-[#FCE8EC] grid place-items-center text-sm">3</span>
              <div className="text-sm"><div className="font-semibold">{isVi ? "Xác nhận" : "Confirmation"}</div><div className="text-[#6E4A56]">{isVi ? "Chúng tôi xác nhận qua email và xóa trong 30 ngày. Bạn có thể hủy trong 7 ngày đầu bằng cách đăng nhập lại." : "We confirm by email and delete within 30 days. You can cancel within 7 days by logging in again."}</div></div>
            </div>
          </div>
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
            <div className="font-semibold">⚠ {isVi ? "Lưu ý" : "Note"}</div>
            <div className="mt-1 leading-relaxed">{isVi ? "Xóa sẽ gỡ bạn khỏi discovery, chặn đăng nhập lại bằng email đó, và ẩn mọi match/tin nhắn. Không thể khôi phục sau 30 ngày." : "Deletion removes you from discovery, blocks re-login with that email, and hides all matches/messages. Cannot be restored after 30 days."}</div>
          </div>
          <div className="flex gap-2">
            <Link href="/profile" className="flex-1 h-11 rounded-full bg-[#2E1A22] text-white grid place-items-center text-sm font-semibold">Profile →</Link>
            <Link href="/privacy" className="flex-1 h-11 rounded-full bg-white border border-[#FCE8EC] grid place-items-center text-sm font-semibold">Privacy</Link>
          </div>
        </div>
        <div className="text-center text-xs font-mono text-[#B08A95] mt-6">support@lumen.app · {isVi ? "Xử lý trong 30 ngày" : "Processed within 30 days"} · Lumen ♥</div>
      </div>
    </div>
  );
}
