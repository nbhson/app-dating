"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

type Prompt = { id: string; question: string; answer: string };
type Profile = {
  id: string;
  name: string;
  age: number;
  bio?: string;
  location: string;
  distance: string;
  occupation?: string;
  education?: string;
  interests: string[];
  photos: { id: string; url: string }[];
  prompts: Prompt[];
  voiceUrl?: string | null;
  voiceDuration?: number | null;
  intent?: string;
  compatibility?: { score: number; shared: string[] };
  dailyAnswer?: { question: string; answer: string } | null;
};

const intentLabel: Record<string, string> = {
  LONG_TERM: "Tìm lâu dài",
  SHORT_TERM: "Tìm hiểu nhẹ",
  FRIENDSHIP: "Bạn trước",
  EXPLORING: "Đang khám phá",
  UNSURE: "Chưa chắc",
};

export default function DiscoverClient() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [usage, setUsage] = useState<{ viewed: number; limit: number; remaining: number } | null>(null);
  const [dailyQ, setDailyQ] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [match, setMatch] = useState<{ matchId: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedAnchor, setSelectedAnchor] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [reveal, setReveal] = useState(false);

  async function fetchNext() {
    setLoading(true);
    setError(null);
    setReveal(false);
    setShowComment(false);
    setSelectedAnchor(null);
    setComment("");
    const res = await fetch("/api/discover/next");
    const data = await res.json();
    if (!res.ok) {
      if (data.error === "DAILY_LIMIT_REACHED") {
        setError("DAILY_LIMIT_REACHED");
        setUsage({ viewed: data.viewed, limit: data.limit, remaining: 0 });
      } else if (data.error === "PROFILE_INCOMPLETE") {
        window.location.href = "/onboarding";
        return;
      } else if (data.error === "NO_PROFILES") {
        setProfile(null);
        setError("NO_PROFILES");
        if (data.viewed !== undefined) setUsage({ viewed: data.viewed, limit: data.limit, remaining: data.limit - data.viewed });
      } else {
        setError(data.error ?? "UNKNOWN");
      }
      setLoading(false);
      return;
    }
    setProfile(data.profile);
    setUsage(data.usage);
    if (data.dailyQuestion) setDailyQ(data.dailyQuestion);
    setPhotoIdx(0);
    setLoading(false);
  }

  useEffect(() => {
    fetch("/api/usage/today")
      .then((r) => r.json())
      .then((d) => {
        if (d.viewed !== undefined) setUsage({ viewed: d.viewed, limit: d.limit, remaining: d.limit - d.viewed });
      });
    fetch("/api/daily-question")
      .then((r) => r.json())
      .then((d) => { if (d.question) setDailyQ(d.question); })
      .catch(() => {});
    fetchNext();
  }, []);

  async function act(type: "like" | "pass") {
    if (!profile || actionLoading) return;
    if (type === "like" && !showComment) {
      setShowComment(true);
      return;
    }
    if (type === "like" && !comment.trim()) return;
    setActionLoading(true);
    const body: any = { toUserId: profile.id };
    if (type === "like") {
      body.comment = comment.trim();
      body.anchor = selectedAnchor;
    }
    const res = await fetch(`/api/discover/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (type === "like" && (data.status === "MATCH_CREATED" || data.status === "MATCH_EXISTS")) {
      setMatch({ matchId: data.matchId });
    } else {
      await fetchNext();
    }
    setActionLoading(false);
  }

  const [unreadTotal, setUnreadTotal] = useState(0);
  useEffect(() => {
    const loadUnread = () => fetch("/api/matches").then(r=>r.json()).then(d=>{
      const total = (d.matches ?? []).reduce((s:number,m:any)=>s+(m.unread||0),0);
      setUnreadTotal(total);
    }).catch(()=>{});
    loadUnread();
    const id = setInterval(loadUnread, 15000);
    return ()=>clearInterval(id);
  }, []);

  if (match) {
    return (
      <div className="flex-1 grid place-items-center p-6 relative">
        <div className="aura aura-peach w-72 h-72 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-sm w-full glass-strong rounded-[32px] p-8 text-center space-y-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#FFF0F3]/60 to-transparent pointer-events-none" />
          <div className="w-16 h-16 rounded-full gradient-primary text-white grid place-items-center mx-auto text-2xl shadow-[0_8px_20px_rgba(255,77,109,0.35)] relative">♥</div>
          <div className="relative">
            <h2 className="font-display text-[28px] leading-none font-medium">Đã kết nối ✨</h2>
            <p className="text-sm text-[#8E6B75] mt-2.5 leading-relaxed">Bạn và <span className="font-semibold text-[#2E1A22]">{profile?.name}</span> đã chọn nhau. Lời nhắn của bạn đã được gửi — nhẹ nhàng và chân thành.</p>
          </div>
          <div className="flex gap-3 pt-1 relative">
            <Link href={`/matches/${match.matchId}`} className="flex-1 h-11 rounded-full bg-[#2E1A22] text-white grid place-items-center text-sm font-semibold shadow-[0_8px_20px_rgba(46,26,34,0.18)] hover:bg-[#1F1218] transition">
              Mở thư →
            </Link>
            <button
              onClick={() => {
                setMatch(null);
                fetchNext();
              }}
              className="flex-1 h-11 rounded-full glass border border-[#F3DDE2] text-sm font-semibold hover:bg-white transition"
            >
              Tiếp tục
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header - floating glass giống menu */}
      <div className="sticky top-4 z-20 px-4 md:px-6 pointer-events-none">
        <div className="max-w-[1020px] mx-auto w-full glass-strong rounded-[24px] md:rounded-[28px] px-4 md:px-5 py-3 flex items-center justify-between border border-white/70 shadow-[0_8px_24px_rgba(46,26,34,0.08),0_2px_8px_rgba(46,26,34,0.04)] pointer-events-auto relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-[#FF8FA3]/10 blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 relative">
            <span className="w-9 h-9 rounded-full gradient-primary text-white grid place-items-center text-[13px] font-bold shadow-[0_4px_12px_rgba(255,77,109,0.3)]">♥</span>
            <div>
              <div className="font-display text-[15px] font-semibold tracking-tight leading-none flex items-center gap-2">Khám phá <span className="hidden sm:inline text-[10px] font-mono tracking-[0.14em] uppercase text-[#FF4D6D] bg-[#FFF0F3] border border-[#FCE8EC] px-2 py-0.5 rounded-full">Bưu thiếp</span></div>
              <div className="hidden md:block text-[11px] text-[#8E6B75] font-medium leading-none mt-0.5">20 bưu thiếp / ngày · chậm mà sâu</div>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3 relative">
            {usage && (
              <div className="flex items-center gap-2 md:gap-3 bg-white/70 border border-[#FCE8EC] rounded-full px-2.5 md:px-3 py-1.5">
                <span className="text-xs font-mono text-[#2E1A22] font-semibold">
                  {String(usage.viewed).padStart(2, "0")}/{String(usage.limit).padStart(2, "0")}
                </span>
                <div className="hidden sm:block h-1.5 w-16 md:w-20 bg-[#FFF0F3] rounded-full overflow-hidden">
                  <div className="h-full gradient-primary rounded-full transition-all duration-500" style={{ width: `${(usage.viewed / usage.limit) * 100}%` }} />
                </div>
                <span className="hidden lg:inline text-[10px] font-mono text-[#B08A95]">còn {usage.remaining}</span>
              </div>
            )}
            <Link href="/matches" className="relative w-10 h-10 rounded-full bg-white border border-[#FCE8EC] grid place-items-center hover:bg-[#FFF0F3] hover:border-[#FFD6DE] transition shadow-sm group">
              <span className="text-[15px] group-hover:scale-110 transition">✉</span>
              {unreadTotal > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full gradient-primary text-white text-[10px] font-bold grid place-items-center shadow-[0_2px_8px_rgba(255,77,109,0.4)] border-2 border-white">
                  {unreadTotal > 99 ? "99+" : unreadTotal}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {dailyQ && !loading && profile && (
        <div className="max-w-[1020px] mx-auto w-full px-4 md:px-6 pt-5">
          <div className="rounded-[20px] bg-[#2E1A22] text-white px-5 py-4 flex gap-4 items-start relative overflow-hidden shadow-[0_8px_24px_rgba(46,26,34,0.18)]">
            <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-[#FF4D6D]/20 blur-2xl" />
            <span className="text-[11px] font-mono tracking-[0.16em] uppercase text-[#FF8FA3] font-semibold mt-0.5 shrink-0 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#FF4D6D] animate-pulse" /> Câu hỏi hôm nay</span>
            <p className="font-display text-[15px] leading-snug flex-1 italic">“{dailyQ}”</p>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center p-4 md:p-6 pb-28 md:pb-6">
        {loading ? (
          <div className="w-full max-w-[1020px] grid md:grid-cols-[1.05fr_1fr] gap-6">
            <div className="h-[560px] rounded-[32px] glass animate-pulse border-white/60" />
            <div className="h-[560px] rounded-[32px] glass animate-pulse hidden md:block border-white/60" />
          </div>
        ) : error === "DAILY_LIMIT_REACHED" ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[560px] mt-6 relative">
            <div className="aura aura-lavender w-72 h-72 -top-10 -right-10 opacity-30 pointer-events-none" />
            <div className="glass-strong rounded-[32px] p-8 md:p-10 text-center space-y-6 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-[#FF8FA3]/10 blur-2xl" />
              <div className="w-16 h-16 rounded-full bg-[#2E1A22] text-white grid place-items-center mx-auto text-xl shadow-[0_8px_20px_rgba(46,26,34,0.18)]">🌙</div>
              <div>
                <div className="font-display text-[26px] font-medium leading-none">Hôm nay đã đủ 20 bưu thiếp</div>
                <p className="text-sm text-[#8E6B75] leading-relaxed mt-3 max-w-[42ch] mx-auto">Lumen cố ý chậm — để mỗi bưu thiếp có trọng lượng. Hãy dành buổi tối cho những kết nối đang có, mai 00:00 sẽ có 20 lá mới.</p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs font-mono text-[#B08A95] bg-[#FFF0F3] border border-[#FCE8EC] rounded-full px-4 py-2 mx-auto w-fit">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> 20/20 đã xem · làm mới lúc 00:00
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <Link href="/matches" className="h-11 rounded-full bg-[#2E1A22] text-white grid place-items-center text-sm font-semibold hover:bg-[#1F1218] transition relative">
                  Xem hòm thư
                  {unreadTotal>0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full gradient-primary text-white text-[10px] font-bold grid place-items-center border-2 border-white">{unreadTotal}</span>}
                </Link>
                <Link href="/profile" className="h-11 rounded-full glass border border-[#FCE8EC] grid place-items-center text-sm font-semibold hover:bg-white transition">Sửa hồ sơ</Link>
              </div>
              <p className="text-[11px] font-mono text-[#B08A95]">Mẹo: trả lời “Câu hỏi hôm nay” trong Hồ sơ để bưu thiếp mai ấm hơn ✨</p>
            </div>
          </motion.div>
        ) : error === "NO_PROFILES" ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[640px] mt-4 relative">
            <div className="aura aura-peach w-80 h-80 -top-16 -left-16 opacity-30 pointer-events-none" />
            <div className="aura aura-lavender w-72 h-72 top-10 -right-12 opacity-25 pointer-events-none" />
            <div className="glass-strong rounded-[32px] p-7 md:p-10 relative overflow-hidden">
              <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-[#FFD6DE]/20 blur-2xl pointer-events-none" />
              {/* stack illustration */}
              <div className="relative w-[220px] h-[160px] mx-auto mb-6">
                <div className="absolute inset-0 glass rounded-[20px] border border-white/70 shadow-[0_8px_24px_rgba(46,26,34,0.06)] rotate-[-6deg] translate-x-1" />
                <div className="absolute inset-0 glass rounded-[20px] border border-white/70 shadow-[0_8px_24px_rgba(46,26,34,0.06)] rotate-[3deg] -translate-x-1" />
                <div className="absolute inset-0 bg-white rounded-[20px] border border-[#FCE8EC] shadow-[0_12px_32px_rgba(46,26,34,0.08)] grid place-items-center p-6">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-[#FFF0F3] border border-[#FCE8EC] grid place-items-center mx-auto text-xl">💌</div>
                    <div className="text-xs font-mono tracking-[0.14em] uppercase text-[#FF4D6D] font-semibold">Hết bưu thiếp</div>
                    <div className="text-[11px] text-[#B08A95]">Đã xem hết gợi ý phù hợp</div>
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full gradient-primary text-white grid place-items-center text-xs shadow-md">♥</div>
                  <div className="absolute -bottom-2 -left-2 w-6 h-6 rounded-full bg-[#2E1A22] text-white grid place-items-center text-[10px]">✦</div>
                </div>
              </div>

              <div className="text-center space-y-3">
                <h3 className="font-display text-[24px] md:text-[26px] font-medium leading-none">Tạm hết người mới rồi 🌱</h3>
                <p className="text-sm text-[#8E6B75] leading-relaxed max-w-[48ch] mx-auto">
                  Bạn đã xem hết những bưu thiếp phù hợp với bộ lọc hiện tại. Không phải lỗi — chỉ là Lumen đang giữ nhịp chậm. Thử nới lỏng một chút, mai sẽ có thêm người mới.
                </p>
                {usage && (
                  <div className="inline-flex items-center gap-2 text-xs font-medium bg-white border border-[#FCE8EC] rounded-full px-3.5 py-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#FF4D6D] animate-pulse" /> Đã xem {usage.viewed}/{usage.limit} hôm nay · còn {usage.remaining} lượt mai
                  </div>
                )}
              </div>

              <div className="mt-6 rounded-[20px] bg-[#FFF0F3]/70 border border-[#FCE8EC] p-4">
                <div className="text-xs font-semibold text-[#6E4A56] flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#FF8FA3]" /> Gợi ý để có thêm bưu thiếp</div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Link href="/profile" className="px-3.5 py-2 rounded-full bg-white border border-[#FCE8EC] text-xs font-semibold hover:border-[#FF8FA3] hover:text-[#FF4D6D] transition">📍 +20 km bán kính</Link>
                  <Link href="/profile" className="px-3.5 py-2 rounded-full bg-white border border-[#FCE8EC] text-xs font-semibold hover:border-[#FF8FA3] hover:text-[#FF4D6D] transition">🎂 Mở rộng ±5 tuổi</Link>
                  <Link href="/profile" className="px-3.5 py-2 rounded-full bg-white border border-[#FCE8EC] text-xs font-semibold hover:border-[#FF8FA3] hover:text-[#FF4D6D] transition">💬 Thử “Đang khám phá”</Link>
                  <button onClick={()=>fetchNext()} className="px-3.5 py-2 rounded-full bg-white border border-[#FCE8EC] text-xs font-semibold hover:bg-[#FFF0F3] transition">🔄 Làm mới</button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-6">
                <Link href="/profile" className="h-11 rounded-full btn-primary grid place-items-center text-sm font-semibold shadow-[0_6px_16px_rgba(255,77,109,0.25)]">
                  Điều chỉnh bộ lọc →
                </Link>
                <button onClick={()=>fetchNext()} className="h-11 rounded-full bg-white border border-[#FCE8EC] text-sm font-semibold hover:bg-[#FFF0F3] transition">
                  Thử lại
                </button>
                <Link href="/matches" className="h-11 rounded-full bg-[#2E1A22] text-white grid place-items-center text-sm font-semibold hover:bg-[#1F1218] transition relative">
                  Hòm thư
                  {unreadTotal>0 && <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#FF4D6D] text-white text-[10px] font-bold grid place-items-center border border-white">{unreadTotal}</span>}
                </Link>
              </div>

              <p className="text-center text-[11px] font-mono text-[#B08A95] mt-4">Bưu thiếp mới xuất hiện khi có người phù hợp đăng ký · Lumen làm mới mỗi ngày lúc 00:00 ✨</p>
            </div>
          </motion.div>
        ) : profile ? (
          <div className="w-full max-w-[1020px] flex flex-col gap-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="grid md:grid-cols-[1.05fr_1fr] gap-6"
              >
                {/* Left: Photo Letter */}
                <div className="glass-strong rounded-[32px] overflow-hidden flex flex-col shadow-[0_12px_40px_rgba(46,26,34,0.08)]">
                  <div className="relative h-[500px] md:h-[580px] bg-[#FFE8EC] overflow-hidden group">
                    <img
                      src={profile.photos[photoIdx]?.url ?? profile.photos[0]?.url}
                      alt=""
                      className={`w-full h-full object-cover transition-all duration-700 ${!reveal ? "blur-[20px] scale-[1.04]" : "blur-0 scale-100"}`}
                    />
                    {!reveal && (
                      <button
                        onClick={() => setReveal(true)}
                        className="absolute inset-0 grid place-items-center bg-[#2E1A22]/20 backdrop-blur-[3px] p-6"
                      >
                        <span className="glass-strong rounded-full px-6 py-3 text-sm font-semibold shadow-[0_8px_24px_rgba(46,26,34,0.18)] flex items-center gap-2 text-[#2E1A22]">
                          <span className="w-7 h-7 rounded-full gradient-primary grid place-items-center text-white text-xs">♥</span>
                          Mở bưu thiếp · {profile.name}
                        </span>
                      </button>
                    )}
                    <div className="absolute top-4 inset-x-4 flex gap-1.5">
                      {profile.photos.map((_, i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i === photoIdx ? "bg-white shadow-[0_1px_4px_rgba(0,0,0,0.2)]" : "bg-white/40"}`} />
                      ))}
                    </div>
                    <button onClick={() => setPhotoIdx((p) => Math.max(0, p - 1))} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 backdrop-blur text-[#2E1A22] grid place-items-center text-sm shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:bg-white transition">‹</button>
                    <button onClick={() => setPhotoIdx((p) => Math.min(profile.photos.length - 1, p + 1))} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 backdrop-blur text-[#2E1A22] grid place-items-center text-sm shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:bg-white transition">›</button>

                    <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-[#1F1218]/85 via-[#1F1218]/25 to-transparent text-white">
                      <div className="font-display text-[24px] leading-none font-medium flex items-baseline gap-2">{profile.name}, <span className="font-light">{profile.age}</span> <span className="ml-1 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] inline-block" /></div>
                      <div className="text-xs font-medium opacity-90 mt-2 flex flex-wrap items-center gap-2">
                        <span className="bg-white/15 backdrop-blur border border-white/20 px-2.5 py-1 rounded-full">{profile.distance} · {profile.location}</span>
                        {profile.intent && <span className="px-2.5 py-1 rounded-full bg-white text-[#2E1A22] text-[11px] font-semibold">{intentLabel[profile.intent] ?? profile.intent}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-between bg-white/60 backdrop-blur border-t border-white/60">
                    <div className="flex gap-1.5">
                      {profile.voiceUrl ? (
                        <span className="px-3 py-1.5 rounded-full bg-white border border-[#FCE8EC] text-xs font-medium flex items-center gap-1.5 shadow-sm"><span className="w-6 h-6 rounded-full gradient-primary grid place-items-center text-white text-[10px]">▶</span> {profile.voiceDuration ?? 15}s voice</span>
                      ) : (
                        <span className="px-3 py-1.5 rounded-full bg-white/70 border border-[#FCE8EC] text-xs text-[#8E6B75]">Chưa có voice</span>
                      )}
                    </div>
                    <button
                      onClick={async () => {
                        const r = prompt("Lý do báo cáo: Fake, Quấy rối, Spam, Nội dung không phù hợp, Lừa đảo, Khác");
                        if (!r) return;
                        await fetch(`/api/users/${profile.id}/report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: r, details: "" }) });
                        alert("Đã gửi báo cáo.");
                        fetchNext();
                      }}
                      className="text-xs font-medium text-[#8E6B75] hover:text-[#2E1A22] border border-[#FCE8EC] rounded-full px-3.5 py-1.5 bg-white/70 hover:bg-white transition"
                    >
                      Báo cáo
                    </button>
                  </div>
                </div>

                {/* Right: Letter Content */}
                <div className="glass-strong rounded-[32px] p-6 md:p-7 flex flex-col gap-6 md:overflow-auto md:max-h-[640px] no-scrollbar">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 text-[10px] font-mono tracking-[0.14em] uppercase text-[#FF4D6D] font-semibold bg-[#FFF0F3] border border-[#FCE8EC] px-3 py-1.5 rounded-full">Bưu thiếp #{usage ? String(usage.viewed).padStart(2, "0") : "—"} · {new Date().toLocaleDateString("vi-VN")} <span className="w-1 h-1 rounded-full bg-[#FF4D6D]" /> Lumen</div>
                    {profile.bio && (
                      <p className="font-display text-[19px] leading-[1.55] text-[#2E1A22]">“{profile.bio}”</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {profile.occupation && <span className="px-3 py-1.5 rounded-full bg-white border border-[#FCE8EC] text-xs font-medium shadow-sm">{profile.occupation}</span>}
                      {profile.education && <span className="px-3 py-1.5 rounded-full bg-white border border-[#FCE8EC] text-xs font-medium shadow-sm">{profile.education}</span>}
                    </div>
                  </div>

                  {profile.dailyAnswer && (
                    <div className="rounded-[20px] bg-[#2E1A22] text-white p-5 space-y-2 relative overflow-hidden shadow-[0_8px_24px_rgba(46,26,34,0.14)]">
                      <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-[#FF4D6D]/15 blur-2xl" />
                      <div className="text-[10px] font-mono tracking-[0.16em] uppercase text-[#FF8FA3] font-semibold">Hôm nay họ trả lời</div>
                      <div className="text-xs opacity-70 italic">“{profile.dailyAnswer.question}”</div>
                      <div className="font-display text-[15.5px] leading-snug">“{profile.dailyAnswer.answer}”</div>
                    </div>
                  )}

                  {profile.compatibility && profile.compatibility.shared.length > 0 && (
                    <div className="rounded-[20px] bg-gradient-to-br from-[#FFF0F3] to-white border border-[#FCE8EC] p-4 flex items-center gap-3.5 shadow-sm">
                      <div className="w-11 h-11 rounded-full gradient-primary text-white grid place-items-center text-xs font-bold shadow-[0_4px_12px_rgba(255,77,109,0.3)] shrink-0">{profile.compatibility.score}%</div>
                      <div className="text-xs leading-snug">
                        <div className="font-semibold text-[#2E1A22]">Chung {profile.compatibility.shared.join(" · ")}</div>
                        <div className="text-[#8E6B75]">Gợi ý để bắt đầu cuộc trò chuyện 💬</div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="text-xs font-semibold tracking-wide text-[#8E6B75] flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#FF8FA3]" /> Sở thích — chạm để chọn làm gợi ý</div>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.interests.map((t) => (
                        <button
                          key={t}
                          onClick={() => { setSelectedAnchor(t); setShowComment(true); }}
                          className={`px-3.5 py-2 rounded-full text-xs font-semibold border transition-all ${selectedAnchor === t ? "bg-[#2E1A22] text-white border-[#2E1A22] shadow-[0_4px_12px_rgba(46,26,34,0.2)]" : "bg-white border-[#FCE8EC] hover:border-[#FF8FA3] hover:text-[#FF4D6D] hover:shadow-sm"}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-xs font-semibold tracking-wide text-[#8E6B75] flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#FF8FA3]" /> Lời tự sự</div>
                    <div className="space-y-3">
                      {profile.prompts.length > 0 ? profile.prompts.map((pr) => (
                        <button
                          key={pr.id}
                          onClick={() => { setSelectedAnchor(pr.question); setShowComment(true); }}
                          className={`w-full text-left rounded-[20px] border p-4 transition-all text-left ${selectedAnchor === pr.question ? "bg-[#2E1A22] text-white border-[#2E1A22] shadow-[0_8px_20px_rgba(46,26,34,0.15)]" : "bg-white border-[#FCE8EC] hover:border-[#FFD6DE] hover:shadow-[0_4px_16px_rgba(46,26,34,0.06)]"}`}
                        >
                          <div className={`text-[11px] font-mono tracking-[0.12em] uppercase font-semibold ${selectedAnchor === pr.question ? "text-[#FF8FA3]" : "text-[#FF4D6D]"}`}>{pr.question}</div>
                          <div className={`font-display text-[15px] leading-snug mt-1.5 ${selectedAnchor === pr.question ? "text-white" : "text-[#2E1A22]"}`}>{pr.answer}</div>
                        </button>
                      )) : (
                        <div className="rounded-[20px] border border-dashed border-[#FCE8EC] p-5 text-sm text-[#8E6B75] text-center bg-white/50">Chưa có lời tự sự — hồ sơ này hơi lặng.</div>
                      )}
                    </div>
                  </div>

                  {/* Comment composer */}
                  <div className={`rounded-[24px] border p-5 space-y-3.5 transition-all ${showComment ? "bg-white border-[#FFD6DE] shadow-[0_8px_24px_rgba(255,77,109,0.12)]" : "bg-[#FFF0F3]/50 border-[#FCE8EC]"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold tracking-wide text-[#6E4A56] flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-[#FFF0F3] border border-[#FCE8EC] grid place-items-center text-[#FF4D6D] text-xs">♥</span>
                        <span className="truncate">{selectedAnchor ? `Về “${selectedAnchor.slice(0, 24)}”` : "Gửi một dòng thật lòng"}</span>
                      </span>
                      {selectedAnchor && <button onClick={() => setSelectedAnchor(null)} className="text-xs font-medium underline text-[#8E6B75] shrink-0">Bỏ chọn</button>}
                    </div>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder={selectedAnchor ? `Mình cũng thích ${selectedAnchor}...` : "Mình ấn tượng vì... (tối thiểu 6 ký tự)"}
                      rows={3}
                      className="w-full rounded-2xl border border-[#FCE8EC] bg-[#FFFCFA] p-3.5 text-sm outline-none focus:border-[#FF8FA3] focus:bg-white placeholder:text-[#B08A95] resize-none transition"
                      onFocus={() => setShowComment(true)}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-[#B08A95] font-medium">{comment.length}/140 {comment.length >= 6 && <span className="text-emerald-500">✓</span>}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => act("pass")}
                          disabled={actionLoading}
                          className="h-10 px-5 rounded-full bg-white border border-[#FCE8EC] text-xs font-semibold hover:bg-[#FFF0F3] disabled:opacity-50 transition"
                        >
                          Để sau
                        </button>
                        <button
                          onClick={() => act("like")}
                          disabled={actionLoading || comment.trim().length < 6}
                          className="h-10 px-6 rounded-full btn-primary text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {actionLoading ? "..." : "Gửi bưu thiếp →"}
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#B08A95] leading-relaxed bg-[#FFF0F3]/70 rounded-xl px-3 py-2 border border-[#FCE8EC]/50">Lumen không có nút “thả tim” trống. Mỗi lượt thích phải kèm một câu — để người kia biết vì sao bạn chọn họ.</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
            <p className="text-center text-[11px] font-mono text-[#B08A95]">Mẹo: Chạm vào một sở thích hoặc câu tự sự để lấy làm chủ đề. Không vuốt — hãy đọc. ✨</p>
          </div>
        ) : (
          /* Fallback trống - tránh màn hình trắng như ảnh */
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[640px] mt-2 relative">
            <div className="aura aura-peach w-80 h-80 -top-16 -left-16 opacity-30 pointer-events-none" />
            <div className="glass-strong rounded-[32px] p-7 md:p-10 relative overflow-hidden text-center space-y-5">
              <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-[#FFD6DE]/20 blur-2xl pointer-events-none" />
              <div className="relative w-[200px] h-[150px] mx-auto">
                <div className="absolute inset-0 glass rounded-[20px] border border-white/70 rotate-[-5deg] translate-x-1" />
                <div className="absolute inset-0 glass rounded-[20px] border border-white/70 rotate-[2deg] -translate-x-1" />
                <div className="absolute inset-0 bg-white rounded-[20px] border border-[#FCE8EC] shadow-[0_12px_32px_rgba(46,26,34,0.08)] grid place-items-center p-5">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-[#FFF0F3] border border-[#FCE8EC] grid place-items-center mx-auto text-xl">💌</div>
                    <div className="text-xs font-mono tracking-[0.14em] uppercase text-[#FF4D6D] font-semibold">Hết bưu thiếp</div>
                    <div className="text-[11px] text-[#B08A95]">Không còn gợi ý lúc này</div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-display text-[22px] font-medium">Chưa có bưu thiếp phù hợp</h3>
                <p className="text-sm text-[#8E6B75] leading-relaxed mt-2 max-w-[46ch] mx-auto">Có thể bạn đã xem hết hoặc bộ lọc đang hơi hẹp. Hãy thử nới lỏng hoặc quay lại sau — Lumen sẽ gửi thêm khi có người mới.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <button onClick={()=>fetchNext()} className="px-4 py-2 rounded-full btn-primary text-xs font-semibold">Thử làm mới →</button>
                <Link href="/profile" className="px-4 py-2 rounded-full bg-white border border-[#FCE8EC] text-xs font-semibold">Điều chỉnh bộ lọc</Link>
                <Link href="/matches" className="px-4 py-2 rounded-full bg-[#2E1A22] text-white text-xs font-semibold relative">Hòm thư {unreadTotal>0 && <span className="ml-1 bg-[#FF4D6D] text-white px-1.5 py-0.5 rounded-full text-[10px]">{unreadTotal}</span>}</Link>
              </div>
              <p className="text-[11px] font-mono text-[#B08A95]">Mẹo: cập nhật hồ sơ thật ấm để được ưu tiên hiển thị ✨</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
