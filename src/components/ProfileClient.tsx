"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";

const promptQs = [
  "Điều khiến mình tò mò gần đây",
  "Một ngày Chủ Nhật hoàn hảo",
  "Cách mình thể hiện sự quan tâm",
  "Điều mình đang học về bản thân",
  "Chuyến đi khiến mình thay đổi",
  "Mình muốn được hiểu điều gì ngay từ đầu",
];

export default function ProfileClient({ user }: { user: any }) {
  const [form, setForm] = useState({
    bio: user.profile?.bio ?? "",
    occupation: user.profile?.occupation ?? "",
    education: user.profile?.education ?? "",
    location: user.profile?.location ?? "",
    firstName: user.profile?.firstName ?? "",
    interests: user.profile?.interests ? JSON.parse(user.profile.interests) : [],
  });
  const [pref, setPref] = useState({
    interestedIn: user.preferences?.interestedIn ?? "EVERYONE",
    intent: user.preferences?.intent ?? "UNSURE",
    minAge: user.preferences?.minAge ?? 18,
    maxAge: user.preferences?.maxAge ?? 99,
    maxDistance: user.preferences?.maxDistance ?? 50,
  });
  const [coords, setCoords] = useState<{ lat:number; lng:number } | null>(
    user.profile?.latitude != null && user.profile?.longitude != null ? { lat: user.profile.latitude, lng: user.profile.longitude } : null
  );
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<any[]>(user.promptAnswers ?? []);
  const [newPromptQ, setNewPromptQ] = useState(promptQs[0]);
  const [newPromptA, setNewPromptA] = useState("");
  const [photos, setPhotos] = useState<any[]>(user.photos ?? []);
  const [saving, setSaving] = useState(false);
  const [dailyQ, setDailyQ] = useState<string | null>(null);
  const [dailyA, setDailyA] = useState("");
  const [voiceUrl, setVoiceUrl] = useState(user.profile?.voiceUrl ?? null);

  // load once
  if (dailyQ === null) { fetch("/api/daily-answer").then(r=>r.json()).then(d=>{ setDailyQ(d.question); setDailyA(d.answer??"");}).catch(()=>{}); }

  async function requestGeo(){
    if(!navigator.geolocation){ setGeoStatus("Trình duyệt không hỗ trợ định vị"); return; }
    setGeoStatus("Đang lấy vị trí...");
    navigator.geolocation.getCurrentPosition(
      pos=>{ setCoords({lat:pos.coords.latitude, lng:pos.coords.longitude}); setGeoStatus(`Đã lấy ~ ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)} (±${Math.round(pos.coords.accuracy)}m)`); },
      err=> setGeoStatus("Lỗi: "+err.message),
      { enableHighAccuracy:false, timeout:8000 }
    );
  }

  async function save() {
    setSaving(true);
    await fetch("/api/profile/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, interests: form.interests, preferences: pref, promptAnswers: prompts.map((p:any)=>({question:p.question, answer:p.answer})), latitude: coords?.lat ?? null, longitude: coords?.lng ?? null }),
    });
    if (dailyQ && dailyA.trim().length >= 4) {
      await fetch("/api/daily-answer", { method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ answer: dailyA }) });
    }
    setSaving(false);
    alert("Đã lưu ✨");
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    const res = await fetch("/api/profile/photos", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) setPhotos((p) => [...p, data.photo]);
    else alert(data.error);
  }

  async function addPrompt() {
    if (!newPromptA.trim() || prompts.length >=3) return;
    const res = await fetch("/api/prompts", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ question: newPromptQ, answer: newPromptA }) });
    const d = await res.json();
    if (res.ok) { setPrompts((p)=>[...p, d.answer]); setNewPromptA(""); }
    else alert(d.error);
  }

  const inputClass = "w-full h-11 rounded-2xl border border-[#FCE8EC] px-4 bg-white/70 focus:bg-white focus:border-[#FF8FA3] outline-none text-sm transition placeholder:text-[#B08A95]";
  const card = "glass-strong rounded-[28px] p-6 space-y-4 relative overflow-hidden";

  return (
    <div className="max-w-2xl mx-auto w-full p-4 md:p-6 pb-28 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[26px] font-medium flex items-center gap-2">Hồ sơ bưu thiếp <span className="text-[#FF8FA3]">♥</span></h1>
        <button onClick={() => signOut({ callbackUrl: "/" })} className="text-sm font-medium border border-[#FCE8EC] rounded-full px-4 py-2 bg-white hover:bg-[#FFF0F3] transition">Đăng xuất</button>
      </div>

      <div className={card}>
        <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-[#FF8FA3]/10 blur-2xl pointer-events-none" />
        <h2 className="font-semibold flex items-center gap-2">Ảnh <span className="text-xs font-mono bg-[#FFF0F3] border border-[#FCE8EC] px-2 py-1 rounded-full text-[#8E6B75]">{photos.length}/6</span> <span className="ml-auto text-xs text-[#B08A95]">Chạm ✕ để xóa</span></h2>
        <div className="grid grid-cols-3 gap-3">
          {photos.map((p) => (
            <div key={p.id} className="aspect-[3/4] rounded-[20px] overflow-hidden bg-[#FFE8EC] relative border border-white shadow-sm group">
              <img src={p.url} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition duration-500" />
              <button
                onClick={async () => {
                  const r = await fetch(`/api/profile/photos/${p.id}`, { method: "DELETE" });
                  const d = await r.json();
                  if (!r.ok) return alert(d.error);
                  setPhotos((prev) => prev.filter((x) => x.id !== p.id));
                }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[#2E1A22]/70 backdrop-blur text-white text-xs grid place-items-center hover:bg-[#2E1A22] transition"
              >
                ✕
              </button>
            </div>
          ))}
          {photos.length < 6 && (
            <label className="aspect-[3/4] rounded-[20px] border-2 border-dashed border-[#FCE8EC] grid place-items-center bg-white/60 hover:bg-white cursor-pointer transition group">
              <input type="file" accept="image/*" className="hidden" onChange={upload} />
              <span className="text-sm text-[#8E6B75] flex flex-col items-center gap-1 group-hover:text-[#FF4D6D] transition"><span className="w-8 h-8 rounded-full bg-[#FFF0F3] border border-[#FCE8EC] grid place-items-center text-lg">+</span> Tải ảnh</span>
            </label>
          )}
        </div>
        <div className="rounded-2xl border border-[#FCE8EC] bg-gradient-to-br from-[#FFF0F3] to-white p-4 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full gradient-primary grid place-items-center text-white text-xs shrink-0">♪</span>
          <span className="text-sm font-semibold">Voice 15s</span>
          {voiceUrl ? (
            <>
              <audio controls src={voiceUrl} className="flex-1 h-8 rounded-full" />
              <button onClick={async()=>{ await fetch("/api/profile/voice",{method:"DELETE"}); setVoiceUrl(null);}} className="text-xs font-medium underline text-[#8E6B75]">Xóa</button>
            </>
          ) : (
            <label className="ml-auto text-xs font-semibold border border-[#FCE8EC] rounded-full px-4 py-2 bg-white hover:bg-[#FFF0F3] cursor-pointer transition">
              <input type="file" accept="audio/*" className="hidden" onChange={async(e)=>{
                const f=e.target.files?.[0]; if(!f) return;
                const fd=new FormData(); fd.append("file", f); fd.append("duration","15");
                const r=await fetch("/api/profile/voice",{method:"POST", body:fd}); const d=await r.json(); if(r.ok) setVoiceUrl(d.url);
              }} />
              Tải voice
            </label>
          )}
        </div>
      </div>

      <div className={card}>
        <h2 className="font-semibold flex items-center gap-2"><span className="w-7 h-7 rounded-full bg-[#2E1A22] text-white grid place-items-center text-xs">✦</span> Câu hỏi hôm nay</h2>
        {dailyQ ? (
          <div className="space-y-3">
            <div className="rounded-2xl bg-[#2E1A22] text-white p-4 relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-16 h-16 rounded-full bg-[#FF4D6D]/15 blur-xl" />
              <div className="text-sm font-display italic relative">“{dailyQ}”</div>
            </div>
            <textarea value={dailyA} onChange={(e)=>setDailyA(e.target.value)} rows={2} placeholder="Viết 1–2 câu, sẽ hiện trong bưu thiếp hôm nay..." className="w-full rounded-2xl border border-[#FCE8EC] p-3.5 bg-white/70 focus:bg-white focus:border-[#FF8FA3] outline-none text-sm placeholder:text-[#B08A95] transition" maxLength={300} />
            <div className="text-[11px] font-mono text-[#B08A95] flex items-center gap-2"><span className={`${dailyA.length>0?"text-emerald-500":""} font-semibold`}>{dailyA.length}/300</span> — trả lời hôm nay để người khác thấy bạn đang nghĩ gì ✨</div>
          </div>
        ) : <div className="text-sm text-[#8E6B75]">Đang tải...</div>}
      </div>

      <div className={card}>
        <h2 className="font-semibold">Lời tự sự <span className="text-xs font-mono text-[#FF4D6D] bg-[#FFF0F3] border border-[#FCE8EC] px-2 py-1 rounded-full">{prompts.length}/3</span></h2>
        {prompts.map((p:any)=> (
          <div key={p.id} className="rounded-2xl border border-[#FCE8EC] bg-white p-4 flex justify-between gap-3 shadow-sm">
            <div>
              <div className="text-[11px] font-mono tracking-[0.12em] uppercase text-[#FF4D6D] font-semibold">{p.question}</div>
              <div className="text-sm font-display mt-1.5 leading-snug">{p.answer}</div>
            </div>
            <button onClick={async()=>{ await fetch(`/api/prompts?id=${p.id}`,{method:"DELETE"}); setPrompts(prev=>prev.filter((x:any)=>x.id!==p.id));}} className="text-xs font-medium underline text-[#8E6B75] shrink-0 hover:text-[#FF4D6D]">Xóa</button>
          </div>
        ))}
        {prompts.length < 3 && (
          <div className="rounded-2xl border-2 border-dashed border-[#FCE8EC] p-4 space-y-3 bg-white/60">
            <select value={newPromptQ} onChange={(e)=>setNewPromptQ(e.target.value)} className={inputClass}>
              {promptQs.map(q=><option key={q} value={q}>{q}</option>)}
            </select>
            <textarea value={newPromptA} onChange={(e)=>setNewPromptA(e.target.value)} rows={2} placeholder="Trả lời chân thành, mềm mại..." className="w-full rounded-2xl border border-[#FCE8EC] p-3.5 text-sm bg-white/70 focus:bg-white focus:border-[#FF8FA3] outline-none placeholder:text-[#B08A95] transition" maxLength={300} />
            <button onClick={addPrompt} disabled={!newPromptA.trim()} className="h-10 px-5 rounded-full bg-[#2E1A22] text-white text-xs font-semibold disabled:opacity-40 hover:bg-[#1F1218] transition">Thêm lời tự sự →</button>
          </div>
        )}
      </div>

      <div className={card}>
        <h2 className="font-semibold flex items-center gap-2">Thông tin <span className="ml-auto text-[11px] font-mono text-[#B08A95]">Hiển thị trên bưu thiếp</span></h2>
        <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="Tên hiển thị" className={inputClass} />
        <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Nơi ở — ví dụ: Thảo Điền, Q2" className={inputClass} />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={requestGeo} className="text-xs font-semibold border border-[#FCE8EC] rounded-full px-4 py-2 bg-white hover:bg-[#FFF0F3] transition">📍 Cập nhật vị trí thật</button>
          {coords && <span className="text-[11px] font-mono bg-white border border-[#FCE8EC] px-2.5 py-1 rounded-full text-[#8E6B75]">{coords.lat.toFixed(3)}, {coords.lng.toFixed(3)} <button onClick={()=>setCoords(null)} className="underline ml-1 hover:text-[#FF4D6D]">Xóa</button></span>}
        </div>
        {geoStatus && <div className="text-[11px] font-mono text-[#FF4D6D] bg-[#FFF0F3] border border-[#FCE8EC] px-3 py-2 rounded-xl">{geoStatus}</div>}
        <div className="text-[11px] text-[#B08A95] bg-[#FFFCFA] border border-[#FCE8EC]/50 rounded-xl px-3 py-2">Khoảng cách hiện làm mờ (“~ 3 km • vị trí thật”). Không chia sẻ sẽ hiện “Khoảng cách ẩn”.</div>
        <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Bio — như một bưu thiếp mềm mại, nói về bạn..." rows={3} className="w-full rounded-2xl border border-[#FCE8EC] p-3.5 bg-white/70 focus:bg-white focus:border-[#FF8FA3] outline-none text-sm placeholder:text-[#B08A95] transition" />
        <div className="grid grid-cols-2 gap-3">
          <input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} placeholder="Nghề nghiệp" className={inputClass} />
          <input value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} placeholder="Học vấn" className={inputClass} />
        </div>
      </div>

      <div className={card}>
        <h2 className="font-semibold">Bạn tìm gì</h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["MEN", "Nam"],
            ["WOMEN", "Nữ"],
            ["EVERYONE", "Tất cả"],
          ].map(([v, l]) => (
            <button key={v} onClick={() => setPref({ ...pref, interestedIn: v })} className={`h-11 rounded-2xl border text-sm font-semibold transition ${pref.interestedIn === v ? "bg-[#2E1A22] text-white border-[#2E1A22] shadow-[0_4px_12px_rgba(46,26,34,0.15)]" : "bg-white border-[#FCE8EC] text-[#8E6B75] hover:border-[#FFD6DE]"}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ["LONG_TERM","Lâu dài"],
            ["SHORT_TERM","Nhẹ nhàng"],
            ["FRIENDSHIP","Bạn"],
            ["EXPLORING","Khám phá"],
            ["UNSURE","Chưa biết"],
          ].map(([v,l])=>(
            <button key={v} onClick={()=>setPref({...pref, intent:v})} className={`px-4 py-2 rounded-full text-xs font-semibold border transition ${pref.intent===v ? "gradient-primary text-white border-transparent shadow-[0_4px_12px_rgba(255,77,109,0.25)]" : "bg-white border-[#FCE8EC] text-[#8E6B75] hover:border-[#FFD6DE]"}`}>{l}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm font-medium">Từ <input type="number" value={pref.minAge} onChange={(e) => setPref({ ...pref, minAge: Number(e.target.value) })} className={`${inputClass} mt-1.5`} /></label>
          <label className="text-sm font-medium">Đến <input type="number" value={pref.maxAge} onChange={(e) => setPref({ ...pref, maxAge: Number(e.target.value) })} className={`${inputClass} mt-1.5`} /></label>
        </div>
        <label className="space-y-2 block">
          <span className="text-sm font-semibold flex items-center gap-2">Bán kính: <span className="text-[#FF4D6D]">{pref.maxDistance} km</span> <span className="ml-auto text-xs font-mono text-[#B08A95]">5 — 200 km</span></span>
          <input type="range" min={5} max={200} step={5} value={pref.maxDistance} onChange={(e)=>setPref({...pref, maxDistance:Number(e.target.value)})} className="w-full accent-[#FF4D6D]" />
        </label>
      </div>

      <button onClick={save} disabled={saving} className="w-full h-[52px] rounded-full btn-primary font-semibold disabled:opacity-50 shadow-[0_8px_20px_rgba(255,77,109,0.28)]">
        {saving ? "Đang lưu..." : "Lưu thay đổi ✨"}
      </button>

      <div className="glass rounded-[24px] p-6 space-y-3 border border-red-100">
        <h2 className="font-semibold text-[#8E2C3A] flex items-center gap-2">Tài khoản <span className="text-xs font-mono bg-red-50 border border-red-200 px-2 py-1 rounded-full">Nguy hiểm</span></h2>
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 leading-relaxed">Khu vực nguy hiểm — xóa sẽ ẩn hồ sơ và chặn đăng nhập lại bằng email này.</div>
        <button
          onClick={async () => {
            if (!confirm("Bạn chắc chắn muốn XÓA tài khoản? Hành động này sẽ ẩn hồ sơ.")) return;
            const typed = prompt(`Gõ email của bạn (${user.email}) để xác nhận xóa:`);
            if (typed === null) return;
            if (typed.trim().toLowerCase() !== user.email.toLowerCase()) {
              alert("Email không khớp — đã hủy xóa.");
              return;
            }
            await fetch("/api/profile/me", { method: "DELETE" });
            await signOut({ callbackUrl: "/" });
          }}
          className="w-full h-11 rounded-full border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 font-semibold text-sm transition"
        >
          Xóa tài khoản
        </button>
        <div className="text-[11px] font-mono text-[#B08A95] text-center">
          Email: {user.email} · ID: {user.id.slice(0, 8)}
        </div>
      </div>

      <div className="text-center text-xs font-mono text-[#B08A95] pb-2">
        <a href="/admin" className="hover:text-[#2E1A22] hover:underline">Admin</a> · <a href="/privacy" className="hover:text-[#2E1A22] hover:underline">Privacy</a> · Lumen ♥
      </div>
    </div>
  );
}
