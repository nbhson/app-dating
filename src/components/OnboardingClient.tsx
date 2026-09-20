"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";

type Props = {
  initial: { profile: any; photos: any[]; preferences: any; promptAnswers?: any[] };
};

const interestsList = ["Coffee", "Travel", "Music", "Hiking", "Yoga", "Books", "Movies", "Gaming", "Cooking", "Art", "Fitness", "Photography"];
const promptQuestions = [
  "Điều khiến mình tò mò gần đây",
  "Một ngày Chủ Nhật hoàn hảo",
  "Cách mình thể hiện sự quan tâm",
  "Điều mình đang học về bản thân",
  "Chuyến đi khiến mình thay đổi",
  "Mình muốn được hiểu điều gì ngay từ đầu",
];
const intents = [
  ["LONG_TERM", "Lâu dài"],
  ["SHORT_TERM", "Nhẹ nhàng"],
  ["FRIENDSHIP", "Bạn trước"],
  ["EXPLORING", "Khám phá"],
  ["UNSURE", "Chưa biết"],
];

export default function OnboardingClient({ initial }: Props) {
  const router = useRouter();
  const { t, trans } = useI18n();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    firstName: initial.profile?.firstName ?? "",
    dob: initial.profile?.dob ? new Date(initial.profile.dob).toISOString().slice(0, 10) : "1998-01-01",
    gender: initial.profile?.gender ?? "WOMAN",
    location: initial.profile?.location ?? "",
    bio: initial.profile?.bio ?? "",
    occupation: initial.profile?.occupation ?? "",
    education: initial.profile?.education ?? "",
    interests: initial.profile?.interests ? JSON.parse(initial.profile.interests) : [] as string[],
    interestedIn: initial.preferences?.interestedIn ?? "EVERYONE",
    intent: initial.preferences?.intent ?? "UNSURE",
    minAge: initial.preferences?.minAge ?? 22,
    maxAge: initial.preferences?.maxAge ?? 32,
    maxDistance: initial.preferences?.maxDistance ?? 50,
  });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initial.profile?.latitude != null && initial.profile?.longitude != null ? { lat: initial.profile.latitude, lng: initial.profile.longitude } : null
  );
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<{ question: string; answer: string }[]>(
    initial.promptAnswers?.length ? initial.promptAnswers.map((p: any) => ({ question: p.question, answer: p.answer })) : [{ question: promptQuestions[0], answer: "" }]
  );
  const [photos, setPhotos] = useState<any[]>(initial.photos);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceUrl, setVoiceUrl] = useState(initial.profile?.voiceUrl ?? null);

  function toggleInterest(v: string) {
    setForm((f) => ({ ...f, interests: f.interests.includes(v) ? f.interests.filter((x: string) => x !== v) : [...f.interests, v] }));
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    setUploading(true);
    const res = await fetch("/api/profile/photos", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) setPhotos((p) => [...p, data.photo]);
    else alert(data.error ?? "Upload failed");
    setUploading(false);
  }

  async function requestGeo() {
    if (!navigator.geolocation) { setGeoStatus("Trình duyệt không hỗ trợ định vị"); return; }
    setGeoStatus("Đang lấy vị trí...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus(`Đã lấy vị trí ~ ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)} (±${Math.round(pos.coords.accuracy)}m)`);
      },
      (err) => setGeoStatus("Không lấy được vị trí: " + err.message),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/profile/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.firstName,
        dob: form.dob,
        gender: form.gender,
        location: form.location,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        bio: form.bio,
        occupation: form.occupation,
        education: form.education,
        interests: form.interests,
        preferences: { interestedIn: form.interestedIn, intent: form.intent, minAge: form.minAge, maxAge: form.maxAge, maxDistance: form.maxDistance },
        promptAnswers: prompts.filter((p) => p.answer.trim().length >= 4),
        voiceUrl: voiceUrl ?? undefined,
      }),
    });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error ?? "Save failed");
      setSaving(false);
      return;
    }
    if (photos.length === 0) {
      alert("Hãy thêm ít nhất 1 ảnh");
      setSaving(false);
      return;
    }
    router.push("/discover");
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="max-w-2xl w-full mx-auto p-6 md:p-10 flex-1 flex flex-col relative">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-2xl gradient-primary grid place-items-center text-white shadow-[0_6px_16px_rgba(255,77,109,0.3)]">♥</div>
          <span className="font-display text-lg font-semibold">Lumen</span>
          <span className="ml-auto text-xs font-mono bg-white border border-[#FCE8EC] px-3 py-1.5 rounded-full text-[#8E6B75]">{trans("onboarding.stepOf", { current: step, total: 5 })}</span>
        </div>

        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className={`h-2 flex-1 rounded-full transition-all ${s <= step ? "gradient-primary shadow-sm" : "bg-[#FFE8EC] border border-[#FCE8EC]"}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="font-display text-2xl">Bạn là ai?</h2>
            <div className="grid gap-4">
              <label className="space-y-1">
                <span className="text-sm font-medium">Tên gọi</span>
                <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="w-full h-11 rounded-xl border border-[#E8DDD3] px-4 bg-white" placeholder="Emma" />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-1">
                  <span className="text-sm font-medium">Ngày sinh</span>
                  <input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} className="w-full h-11 rounded-xl border border-[#E8DDD3] px-4 bg-white" />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium">Giới tính</span>
                  <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full h-11 rounded-xl border border-[#E8DDD3] px-4 bg-white">
                    <option value="WOMAN">Nữ</option>
                    <option value="MAN">Nam</option>
                    <option value="NON_BINARY">Khác</option>
                  </select>
                </label>
              </div>
              <label className="space-y-1">
                <span className="text-sm font-medium">Nơi ở</span>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full h-11 rounded-xl border border-[#E8DDD3] px-4 bg-white" placeholder="Quận 1, Sài Gòn" />
                <div className="flex items-center gap-2">
                  <button type="button" onClick={requestGeo} className="text-xs border border-[#E8DDD3] rounded-full px-3 py-1.5 bg-[#FDF8F4] hover:bg-white">📍 Dùng vị trí thật để tính km</button>
                  {coords && <span className="text-[11px] font-mono text-[#6B6B6B]">{coords.lat.toFixed(3)}, {coords.lng.toFixed(3)} <button onClick={()=>setCoords(null)} className="underline ml-1">Xóa</button></span>}
                </div>
                {geoStatus && <div className="text-[11px] font-mono text-[#8A9A8E]">{geoStatus}</div>}
                <div className="text-[11px] text-[#9A9A9A] leading-relaxed">Vị trí được làm mờ khi hiện (“~ 3 km”) để bảo vệ privacy. Không chia sẻ cũng được — sẽ hiện “Khoảng cách ẩn”.</div>
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">Giới thiệu (như một bưu thiếp)</span>
                <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} className="w-full rounded-xl border border-[#E8DDD3] p-3 bg-white" placeholder="Mình thích buổi sáng chậm và..." />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} placeholder="Nghề nghiệp" className="h-11 rounded-xl border border-[#E8DDD3] px-4 bg-white" />
                <input value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} placeholder="Học vấn" className="h-11 rounded-xl border border-[#E8DDD3] px-4 bg-white" />
              </div>
              <div>
                <div className="text-sm font-medium mb-2">Sở thích — chọn 3-5</div>
                <div className="flex flex-wrap gap-2">
                  {interestsList.map((i) => (
                    <button
                      key={i}
                      onClick={() => toggleInterest(i)}
                      className={`px-3 py-1.5 rounded-full text-sm border ${form.interests.includes(i) ? "bg-[#1A1A1E] text-white border-[#1A1A1E]" : "bg-white hover:bg-[#F2EDE8] border-[#E8DDD3]"}`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => setStep(2)} disabled={!form.firstName} className="w-full h-12 rounded-full bg-[#1A1A1E] text-white font-medium disabled:opacity-50">
              Tiếp tục
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="font-display text-2xl">Bạn tìm gì?</h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-2">Quan tâm đến</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ["MEN", "Nam"],
                    ["WOMEN", "Nữ"],
                    ["EVERYONE", "Mọi người"],
                  ].map(([v, l]) => (
                    <button
                      key={v}
                      onClick={() => setForm({ ...form, interestedIn: v })}
                      className={`h-11 rounded-xl border font-medium text-sm ${form.interestedIn === v ? "bg-[#1A1A1E] text-white border-[#1A1A1E]" : "bg-white border-[#E8DDD3]"}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">Mong muốn</div>
                <div className="flex flex-wrap gap-2">
                  {intents.map(([v, l]) => (
                    <button key={v} onClick={() => setForm({ ...form, intent: v })} className={`px-3 py-2 rounded-full text-xs font-medium border ${form.intent === v ? "bg-[#C96442] text-white border-[#C96442]" : "bg-white border-[#E8DDD3] hover:border-[#C96442]/40"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-1">
                  <span className="text-sm font-medium">Tuổi nhỏ nhất: {form.minAge}</span>
                  <input type="range" min={18} max={70} value={form.minAge} onChange={(e) => setForm({ ...form, minAge: Number(e.target.value) })} className="w-full accent-[#C96442]" />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium">Tuổi lớn nhất: {form.maxAge}</span>
                  <input type="range" min={18} max={70} value={form.maxAge} onChange={(e) => setForm({ ...form, maxAge: Number(e.target.value) })} className="w-full accent-[#C96442]" />
                </label>
              </div>
              <label className="space-y-1">
                <span className="text-sm font-medium">Khoảng cách tối đa: {form.maxDistance} km</span>
                <input type="range" min={5} max={200} step={5} value={form.maxDistance} onChange={(e) => setForm({ ...form, maxDistance: Number(e.target.value) })} className="w-full accent-[#8A9A8E]" />
                <span className="text-[11px] text-[#9A9A9A]">Chỉ hiện người trong bán kính này nếu cả hai đã chia sẻ vị trí.</span>
              </label>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 h-12 rounded-full border border-[#E8DDD3] bg-white font-medium">Quay lại</button>
              <button onClick={() => setStep(3)} className="flex-1 h-12 rounded-full bg-[#1A1A1E] text-white font-medium">Tiếp</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="font-display text-2xl">Lời tự sự</h2>
            <p className="text-sm text-[#6B6B6B]">Chọn 1–3 câu hỏi và trả lời thật lòng. Đây là thứ người khác sẽ chạm để mở lời với bạn.</p>
            <div className="space-y-3">
              {prompts.map((p, idx) => (
                <div key={idx} className="rounded-2xl border border-[#E8DDD3] bg-white p-4 space-y-2">
                  <select value={p.question} onChange={(e) => setPrompts((arr) => arr.map((x, i) => (i === idx ? { ...x, question: e.target.value } : x)))} className="w-full h-9 rounded-xl border border-[#E8DDD3] px-3 text-sm bg-[#FDF8F4]">
                    {promptQuestions.map((q) => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                  <textarea value={p.answer} onChange={(e) => setPrompts((arr) => arr.map((x, i) => (i === idx ? { ...x, answer: e.target.value } : x)))} rows={2} placeholder="Viết 1–2 câu..." className="w-full rounded-xl border border-[#E8DDD3] p-3 text-sm bg-[#FDF8F4]" maxLength={300} />
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-mono text-[#9A9A9A]">{p.answer.length}/300</span>
                    {prompts.length > 1 && <button onClick={() => setPrompts((a) => a.filter((_, i) => i !== idx))} className="text-xs underline text-[#6B6B6B]">Xóa</button>}
                  </div>
                </div>
              ))}
            </div>
            {prompts.length < 3 && <button onClick={() => setPrompts((a) => [...a, { question: promptQuestions[prompts.length % promptQuestions.length], answer: "" }])} className="w-full h-11 rounded-full border border-dashed border-[#E8DDD3] bg-white text-sm">+ Thêm prompt</button>}
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 h-12 rounded-full border border-[#E8DDD3] bg-white font-medium">Quay lại</button>
              <button onClick={() => setStep(4)} className="flex-1 h-12 rounded-full bg-[#1A1A1E] text-white font-medium">Tiếp</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h2 className="font-display text-2xl">Ảnh & Voice</h2>
            <p className="text-sm text-[#6B6B6B]">1–6 ảnh. Voice 15s là tùy chọn nhưng giúp hồ sơ ấm hơn — người khác sẽ nghe trước khi thấy rõ.</p>
            <div className="grid grid-cols-3 gap-3">
              {photos.map((p) => (
                <div key={p.id} className="aspect-[3/4] rounded-2xl overflow-hidden bg-[#F2EDE8] relative border border-[#E8DDD3]">
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={async () => {
                      await fetch(`/api/profile/photos/${p.id}`, { method: "DELETE" });
                      setPhotos((prev) => prev.filter((x) => x.id !== p.id));
                    }}
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-[#1A1A1E]/70 text-white grid place-items-center text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {photos.length < 6 && (
                <label className="aspect-[3/4] rounded-2xl border-2 border-dashed border-[#E8DDD3] grid place-items-center bg-white hover:bg-[#F2EDE8] cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={upload} disabled={uploading} />
                  <span className="text-sm text-[#6B6B6B]">{uploading ? "..." : "+ Ảnh"}</span>
                </label>
              )}
            </div>
            <div className="rounded-2xl border border-[#E8DDD3] bg-white p-4 space-y-3">
              <div className="text-sm font-medium">Voice intro (15s)</div>
              {voiceUrl ? (
                <div className="flex items-center gap-3">
                  <audio controls src={voiceUrl} className="flex-1 h-9" />
                  <button onClick={async () => { await fetch("/api/profile/voice", { method: "DELETE" }); setVoiceUrl(null); }} className="text-xs underline">Xóa</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    disabled={recording}
                    onClick={async () => {
                      try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        const rec = new MediaRecorder(stream);
                        const chunks: BlobPart[] = [];
                        rec.ondataavailable = (e) => chunks.push(e.data);
                        rec.onstop = async () => {
                          const blob = new Blob(chunks, { type: "audio/webm" });
                          const fd = new FormData();
                          fd.append("file", blob, "voice.webm");
                          fd.append("duration", "15");
                          const r = await fetch("/api/profile/voice", { method: "POST", body: fd });
                          const d = await r.json();
                          if (r.ok) setVoiceUrl(d.url);
                          stream.getTracks().forEach((t) => t.stop());
                          setRecording(false);
                        };
                        rec.start();
                        setRecording(true);
                        setTimeout(() => rec.stop(), 15000);
                      } catch {
                        alert("Không truy cập được micro");
                      }
                    }}
                    className="flex-1 h-10 rounded-full bg-[#C96442] text-white text-sm font-medium disabled:opacity-50"
                  >
                    {recording ? "Đang ghi... 15s" : "● Ghi 15s"}
                  </button>
                  <span className="text-xs text-[#6B6B6B] place-self-center">hoặc bỏ qua</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="flex-1 h-12 rounded-full border border-[#E8DDD3] bg-white font-medium">Quay lại</button>
              <button onClick={() => setStep(5)} disabled={photos.length === 0} className="flex-1 h-12 rounded-full bg-[#1A1A1E] text-white font-medium disabled:opacity-50">Tiếp</button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <h2 className="font-display text-2xl">Xem trước bưu thiếp</h2>
            <p className="text-sm text-[#6B6B6B]">Đây là cách người khác sẽ đọc bạn.</p>
            <div className="rounded-[20px] overflow-hidden border border-[#E8DDD3] bg-[#FFFCF8] shadow-sm max-w-sm mx-auto">
              <div className="h-80 bg-[#F2EDE8] relative">
                {photos[0] ? <img src={photos[0].url} alt="" className="w-full h-full object-cover" /> : <div className="grid place-items-center h-full text-[#9A9A9A]">Chưa có ảnh</div>}
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-[#1A1A1E]/70 to-transparent text-white">
                  <div className="font-display text-lg leading-none">
                    {form.firstName || "Bạn"}, {new Date().getFullYear() - new Date(form.dob).getFullYear()}
                  </div>
                  <div className="text-xs font-mono opacity-90">{form.location || "Nearby"} · {form.bio?.slice(0, 48) || "Bưu thiếp mới"}</div>
                </div>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {form.interests.slice(0, 4).map((t: string) => (
                    <span key={t} className="px-2.5 py-1 rounded-full bg-[#F2EDE8] border border-[#E8DDD3] text-xs">{t}</span>
                  ))}
                </div>
                {prompts[0]?.answer && <div className="rounded-xl border border-[#E8DDD3] p-3 bg-[#FDF8F4] text-sm font-display">“{prompts[0].answer.slice(0, 80)}”</div>}
              </div>
            </div>
            <button onClick={save} disabled={saving} className="w-full h-12 rounded-full bg-[#C96442] text-white font-medium disabled:opacity-50">
              {saving ? "Đang lưu..." : "Bắt đầu nhận bưu thiếp →"}
            </button>
            <button onClick={() => setStep(4)} className="w-full h-12 rounded-full border border-[#E8DDD3] bg-white font-medium">Quay lại</button>
          </div>
        )}
      </div>
    </div>
  );
}
