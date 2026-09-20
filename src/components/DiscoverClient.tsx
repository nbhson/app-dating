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
  SHORT_TERM: "Tìm hiểu nhẹ nhàng",
  FRIENDSHIP: "Tình bạn trước",
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

  if (match) {
    return (
      <div className="flex-1 grid place-items-center p-6 bg-[#FDF8F4]">
        <div className="max-w-sm w-full bg-[#FFFCF8] rounded-[24px] p-8 text-center border border-[#E8DDD3] shadow-[0_8px_32px_rgba(26,26,30,0.08)] space-y-5">
          <div className="w-14 h-14 rounded-full bg-[#C96442] text-white grid place-items-center mx-auto text-xl">✦</div>
          <div>
            <h2 className="font-display text-[26px] leading-none">Đã kết nối</h2>
            <p className="text-sm text-[#6B6B6B] mt-2">Bạn và {profile?.name} đã chọn nhau. Lời nhắn của bạn đã được gửi.</p>
          </div>
          <div className="flex gap-3 pt-2">
            <Link href={`/matches/${match.matchId}`} className="flex-1 h-11 rounded-full bg-[#1A1A1E] text-white grid place-items-center text-sm font-medium">
              Mở thư
            </Link>
            <button
              onClick={() => {
                setMatch(null);
                fetchNext();
              }}
              className="flex-1 h-11 rounded-full border border-[#E8DDD3] bg-white text-sm font-medium"
            >
              Tiếp tục
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header - editorial */}
      <div className="sticky top-0 bg-[#FFFCF8]/90 backdrop-blur border-b border-[#E8DDD3] z-20">
        <div className="max-w-[980px] mx-auto w-full px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-[#1A1A1E] text-white grid place-items-center text-[11px] font-mono">Lm</span>
            <span className="font-display text-[15px] tracking-tight">Khám phá</span>
            <span className="hidden md:inline text-xs text-[#6B6B6B] font-mono">— 20 bưu thiếp / ngày</span>
          </div>
          {usage && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-[#6B6B6B]">
                {String(usage.viewed).padStart(2, "0")}/{String(usage.limit).padStart(2, "0")}
              </span>
              <div className="hidden sm:block h-[3px] w-28 bg-[#F2EDE8] rounded-full overflow-hidden">
                <div className="h-full bg-[#C96442] transition-all" style={{ width: `${(usage.viewed / usage.limit) * 100}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {dailyQ && !loading && profile && (
        <div className="max-w-[980px] mx-auto w-full px-4 md:px-6 pt-4">
          <div className="bg-[#1A1A1E] text-[#FDF8F4] rounded-2xl px-5 py-4 flex gap-4 items-start">
            <span className="text-[11px] font-mono tracking-widest uppercase opacity-60 mt-0.5">Câu hỏi hôm nay</span>
            <p className="font-display text-[15px] leading-snug flex-1">“{dailyQ}”</p>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center p-4 md:p-6 pb-24 md:pb-6 bg-[#FDF8F4]">
        {loading ? (
          <div className="w-full max-w-[980px] grid md:grid-cols-[1.05fr_1fr] gap-6">
            <div className="h-[520px] rounded-[20px] bg-[#FFFCF8] border border-[#E8DDD3] animate-pulse" />
            <div className="h-[520px] rounded-[20px] bg-[#FFFCF8] border border-[#E8DDD3] animate-pulse hidden md:block" />
          </div>
        ) : error === "DAILY_LIMIT_REACHED" ? (
          <div className="max-w-md w-full bg-[#FFFCF8] rounded-[20px] border border-[#E8DDD3] p-8 text-center space-y-4 mt-8">
            <div className="font-display text-2xl">Hôm nay đã đủ.</div>
            <p className="text-sm text-[#6B6B6B] leading-relaxed">Bạn đã mở 20 bưu thiếp. Lumen cố ý chậm — quay lại ngày mai, hoặc dành thời gian cho những kết nối đang có.</p>
            <div className="flex gap-2 pt-2">
              <Link href="/matches" className="flex-1 h-11 rounded-full bg-[#1A1A1E] text-white grid place-items-center text-sm font-medium">Xem thư</Link>
              <Link href="/profile" className="flex-1 h-11 rounded-full border border-[#E8DDD3] bg-white grid place-items-center text-sm font-medium">Sửa hồ sơ</Link>
            </div>
          </div>
        ) : error === "NO_PROFILES" ? (
          <div className="max-w-md w-full bg-[#FFFCF8] rounded-[20px] border border-[#E8DDD3] p-8 text-center space-y-3 mt-8">
            <div className="font-display text-xl">Tạm hết người mới</div>
            <p className="text-sm text-[#6B6B6B]">Thử nới lỏng tiêu chí hoặc quay lại sau.</p>
            <Link href="/profile" className="inline-flex h-11 px-6 rounded-full bg-[#1A1A1E] text-white items-center text-sm font-medium">Điều chỉnh</Link>
          </div>
        ) : profile ? (
          <div className="w-full max-w-[980px] flex flex-col gap-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="grid md:grid-cols-[1.05fr_1fr] gap-6"
              >
                {/* Left: Photo Letter */}
                <div className="paper-card rounded-[20px] overflow-hidden flex flex-col">
                  <div className="relative h-[480px] md:h-[560px] bg-[#F2EDE8] overflow-hidden group">
                    <img
                      src={profile.photos[photoIdx]?.url ?? profile.photos[0]?.url}
                      alt=""
                      className={`w-full h-full object-cover transition-all duration-700 ${!reveal ? "blur-[18px] scale-[1.02]" : "blur-0 scale-100"}`}
                    />
                    {!reveal && (
                      <button
                        onClick={() => setReveal(true)}
                        className="absolute inset-0 grid place-items-center bg-[#1A1A1E]/25 backdrop-blur-[2px]"
                      >
                        <span className="bg-[#FFFCF8] text-[#1A1A1E] rounded-full px-5 py-2.5 text-xs font-medium shadow-lg">
                          Mở bưu thiếp · {profile.name}
                        </span>
                      </button>
                    )}
                    <div className="absolute top-3 inset-x-3 flex gap-1">
                      {profile.photos.map((_, i) => (
                        <div key={i} className={`h-[2px] flex-1 rounded-full ${i === photoIdx ? "bg-white" : "bg-white/40"}`} />
                      ))}
                    </div>
                    <button onClick={() => setPhotoIdx((p) => Math.max(0, p - 1))} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#1A1A1E]/40 text-white grid place-items-center text-sm backdrop-blur">‹</button>
                    <button onClick={() => setPhotoIdx((p) => Math.min(profile.photos.length - 1, p + 1))} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#1A1A1E]/40 text-white grid place-items-center text-sm backdrop-blur">›</button>

                    <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-[#1A1A1E]/80 via-[#1A1A1E]/20 to-transparent text-white">
                      <div className="font-display text-[22px] leading-none">{profile.name}, {profile.age}</div>
                      <div className="text-xs font-mono opacity-80 mt-1.5 flex items-center gap-2">
                        <span>{profile.distance}</span>
                        <span className="w-1 h-1 rounded-full bg-white/60" />
                        <span>{profile.location}</span>
                        {profile.intent && <span className="ml-2 px-2 py-0.5 rounded-full bg-white/15 border border-white/20 text-[10px]">{intentLabel[profile.intent] ?? profile.intent}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-between border-t border-[#E8DDD3] bg-[#FFFCF8]">
                    <div className="flex gap-1.5">
                      {profile.voiceUrl ? (
                        <span className="px-2.5 py-1 rounded-full bg-[#F2EDE8] border border-[#E8DDD3] text-xs font-mono flex items-center gap-1.5">▶ {profile.voiceDuration ?? 15}s voice</span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-[#F2EDE8] border border-[#E8DDD3] text-xs text-[#6B6B6B]">Chưa có voice</span>
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
                      className="text-xs font-mono text-[#6B6B6B] hover:text-[#1A1A1E] border border-[#E8DDD3] rounded-full px-3 py-1"
                    >
                      Báo cáo
                    </button>
                  </div>
                </div>

                {/* Right: Letter Content */}
                <div className="paper-card rounded-[20px] p-6 md:p-7 flex flex-col gap-6 md:overflow-auto md:max-h-[620px] no-scrollbar">
                  <div className="space-y-3">
                    <div className="text-[10px] font-mono tracking-[0.14em] uppercase text-[#C96442]">Bưu thiếp #{usage ? String(usage.viewed).padStart(2, "0") : "—"} — {new Date().toLocaleDateString("vi-VN")}</div>
                    {profile.bio && (
                      <p className="font-display text-[18px] leading-[1.6] text-[#1A1A1E]">“{profile.bio}”</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {profile.occupation && <span className="px-2.5 py-1 rounded-full bg-[#F2EDE8] border border-[#E8DDD3] text-xs">{profile.occupation}</span>}
                      {profile.education && <span className="px-2.5 py-1 rounded-full bg-[#F2EDE8] border border-[#E8DDD3] text-xs">{profile.education}</span>}
                    </div>
                  </div>

                  {profile.dailyAnswer && (
                    <div className="rounded-2xl bg-[#1A1A1E] text-[#FDF8F4] p-4 space-y-2">
                      <div className="text-[10px] font-mono tracking-widest uppercase opacity-60">Hôm nay họ trả lời</div>
                      <div className="text-xs opacity-80">“{profile.dailyAnswer.question}”</div>
                      <div className="font-display text-[15px] leading-snug">“{profile.dailyAnswer.answer}”</div>
                    </div>
                  )}

                  {profile.compatibility && profile.compatibility.shared.length > 0 && (
                    <div className="rounded-2xl border border-[#E8DDD3] bg-[#FDF8F4] p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#C96442] text-white grid place-items-center text-xs font-mono">{profile.compatibility.score}%</div>
                      <div className="text-xs leading-snug">
                        <div className="font-medium">Chung {profile.compatibility.shared.join(" · ")}</div>
                        <div className="text-[#6B6B6B]">Gợi ý để bắt đầu cuộc trò chuyện</div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="text-xs font-mono tracking-widest uppercase text-[#6B6B6B]">Sở thích — chạm để chọn làm gợi ý</div>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.interests.map((t) => (
                        <button
                          key={t}
                          onClick={() => { setSelectedAnchor(t); setShowComment(true); }}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${selectedAnchor === t ? "bg-[#1A1A1E] text-white border-[#1A1A1E]" : "bg-white border-[#E8DDD3] hover:border-[#C96442] hover:text-[#C96442]"}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-xs font-mono tracking-widest uppercase text-[#6B6B6B]">Lời tự sự</div>
                    <div className="space-y-3">
                      {profile.prompts.length > 0 ? profile.prompts.map((pr) => (
                        <button
                          key={pr.id}
                          onClick={() => { setSelectedAnchor(pr.question); setShowComment(true); }}
                          className={`w-full text-left rounded-2xl border p-4 transition ${selectedAnchor === pr.question ? "bg-[#1A1A1E] text-[#FDF8F4] border-[#1A1A1E]" : "bg-white border-[#E8DDD3] hover:border-[#C96442]/50"}`}
                        >
                          <div className={`text-[11px] font-mono tracking-widest uppercase ${selectedAnchor === pr.question ? "text-white/60" : "text-[#C96442]"}`}>{pr.question}</div>
                          <div className={`font-display text-[15px] leading-snug mt-1.5 ${selectedAnchor === pr.question ? "text-white" : "text-[#1A1A1E]"}`}>{pr.answer}</div>
                        </button>
                      )) : (
                        <div className="rounded-2xl border border-dashed border-[#E8DDD3] p-4 text-sm text-[#6B6B6B] text-center">Chưa có lời tự sự — hồ sơ này hơi lặng.</div>
                      )}
                    </div>
                  </div>

                  {/* Comment composer */}
                  <div className={`rounded-2xl border p-4 space-y-3 transition ${showComment ? "bg-white border-[#C96442]/30 shadow-sm" : "bg-[#F2EDE8]/50 border-[#E8DDD3]"}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono tracking-widest uppercase text-[#6B6B6B]">
                        {selectedAnchor ? `Gửi lời nhắn về “${selectedAnchor.slice(0, 28)}”` : "Gửi một dòng thật lòng"}
                      </span>
                      {selectedAnchor && <button onClick={() => setSelectedAnchor(null)} className="text-xs underline">Bỏ chọn</button>}
                    </div>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder={selectedAnchor ? `Mình cũng thích ${selectedAnchor}...` : "Mình ấn tượng vì... (tối thiểu 6 ký tự)"}
                      rows={3}
                      className="w-full rounded-xl border border-[#E8DDD3] bg-[#FFFCF8] p-3 text-sm outline-none focus:border-[#C96442] placeholder:text-[#9A9A9A] resize-none"
                      onFocus={() => setShowComment(true)}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-[#9A9A9A]">{comment.length}/140</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => act("pass")}
                          disabled={actionLoading}
                          className="h-9 px-4 rounded-full border border-[#E8DDD3] bg-white text-xs font-medium hover:bg-[#F2EDE8] disabled:opacity-50"
                        >
                          Để sau
                        </button>
                        <button
                          onClick={() => act("like")}
                          disabled={actionLoading || comment.trim().length < 6}
                          className="h-9 px-5 rounded-full bg-[#C96442] text-white text-xs font-medium hover:bg-[#A84E32] disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {actionLoading ? "..." : "Gửi bưu thiếp →"}
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#9A9A9A] leading-relaxed">Lumen không có nút “thả tim” trống. Mỗi lượt thích phải kèm một câu — để người kia biết vì sao bạn chọn họ.</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
            <p className="text-center text-[11px] font-mono text-[#9A9A9A]">Mẹo: Chạm vào một sở thích hoặc câu tự sự để lấy làm chủ đề. Không vuốt — hãy đọc.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
