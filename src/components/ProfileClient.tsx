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

  async function loadDaily() {
    const r = await fetch("/api/daily-answer");
    const d = await r.json();
    setDailyQ(d.question);
    setDailyA(d.answer ?? "");
  }
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
    alert("Đã lưu");
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

  return (
    <div className="max-w-2xl mx-auto w-full p-4 md:p-8 pb-24 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Hồ sơ bưu thiếp</h1>
        <button onClick={() => signOut({ callbackUrl: "/" })} className="text-sm border border-[#E8DDD3] rounded-full px-4 py-2 bg-white">Đăng xuất</button>
      </div>

      <div className="bg-[#FFFCF8] rounded-2xl border border-[#E8DDD3] p-6 space-y-4">
        <h2 className="font-medium">Ảnh ({photos.length}/6)</h2>
        <div className="grid grid-cols-3 gap-3">
          {photos.map((p) => (
            <div key={p.id} className="aspect-[3/4] rounded-xl overflow-hidden bg-[#F2EDE8] relative border border-[#E8DDD3]">
              <img src={p.url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={async () => {
                  const r = await fetch(`/api/profile/photos/${p.id}`, { method: "DELETE" });
                  const d = await r.json();
                  if (!r.ok) return alert(d.error);
                  setPhotos((prev) => prev.filter((x) => x.id !== p.id));
                }}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-[#1A1A1E]/60 text-white text-xs grid place-items-center"
              >
                ✕
              </button>
            </div>
          ))}
          {photos.length < 6 && (
            <label className="aspect-[3/4] rounded-xl border-2 border-dashed border-[#E8DDD3] grid place-items-center bg-[#FDF8F4] cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={upload} />
              <span className="text-sm text-[#6B6B6B]">+ Tải</span>
            </label>
          )}
        </div>
        <div className="rounded-xl border border-[#E8DDD3] bg-[#FDF8F4] p-4 flex items-center gap-3">
          <span className="text-sm font-medium">Voice 15s</span>
          {voiceUrl ? (
            <>
              <audio controls src={voiceUrl} className="flex-1 h-8" />
              <button onClick={async()=>{ await fetch("/api/profile/voice",{method:"DELETE"}); setVoiceUrl(null);}} className="text-xs underline">Xóa</button>
            </>
          ) : (
            <label className="ml-auto text-xs border border-[#E8DDD3] rounded-full px-3 py-1.5 bg-white cursor-pointer">
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

      <div className="bg-[#FFFCF8] rounded-2xl border border-[#E8DDD3] p-6 space-y-4">
        <h2 className="font-medium">Câu hỏi hôm nay</h2>
        {dailyQ ? (
          <div className="space-y-2">
            <div className="text-sm font-display italic">“{dailyQ}”</div>
            <textarea value={dailyA} onChange={(e)=>setDailyA(e.target.value)} rows={2} placeholder="Viết 1–2 câu, sẽ hiện trong bưu thiếp hôm nay..." className="w-full rounded-xl border border-[#E8DDD3] p-3 bg-[#FDF8F4] text-sm" maxLength={300} />
            <div className="text-[11px] font-mono text-[#9A9A9A]">{dailyA.length}/300 — trả lời hôm nay để người khác thấy bạn đang nghĩ gì</div>
          </div>
        ) : <div className="text-sm text-[#6B6B6B]">Đang tải...</div>}
      </div>

      <div className="bg-[#FFFCF8] rounded-2xl border border-[#E8DDD3] p-6 space-y-3">
        <h2 className="font-medium">Lời tự sự (1–3)</h2>
        {prompts.map((p:any)=> (
          <div key={p.id} className="rounded-xl border border-[#E8DDD3] bg-[#FDF8F4] p-3 flex justify-between gap-3">
            <div>
              <div className="text-[11px] font-mono tracking-widest uppercase text-[#C96442]">{p.question}</div>
              <div className="text-sm font-display mt-1">{p.answer}</div>
            </div>
            <button onClick={async()=>{ await fetch(`/api/prompts?id=${p.id}`,{method:"DELETE"}); setPrompts(prev=>prev.filter((x:any)=>x.id!==p.id));}} className="text-xs underline shrink-0">Xóa</button>
          </div>
        ))}
        {prompts.length < 3 && (
          <div className="rounded-xl border border-dashed border-[#E8DDD3] p-3 space-y-2 bg-white">
            <select value={newPromptQ} onChange={(e)=>setNewPromptQ(e.target.value)} className="w-full h-9 rounded-xl border border-[#E8DDD3] px-3 text-sm bg-[#FDF8F4]">
              {promptQs.map(q=><option key={q} value={q}>{q}</option>)}
            </select>
            <textarea value={newPromptA} onChange={(e)=>setNewPromptA(e.target.value)} rows={2} placeholder="Trả lời..." className="w-full rounded-xl border border-[#E8DDD3] p-3 text-sm bg-[#FDF8F4]" maxLength={300} />
            <button onClick={addPrompt} disabled={!newPromptA.trim()} className="h-9 px-4 rounded-full bg-[#1A1A1E] text-white text-xs font-medium disabled:opacity-40">Thêm</button>
          </div>
        )}
      </div>

      <div className="bg-[#FFFCF8] rounded-2xl border border-[#E8DDD3] p-6 space-y-4">
        <h2 className="font-medium">Thông tin</h2>
        <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="Tên" className="w-full h-11 rounded-xl border border-[#E8DDD3] px-4 bg-[#FDF8F4]" />
        <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Nơi ở" className="w-full h-11 rounded-xl border border-[#E8DDD3] px-4 bg-[#FDF8F4]" />
        <div className="flex items-center gap-2">
          <button type="button" onClick={requestGeo} className="text-xs border border-[#E8DDD3] rounded-full px-3 py-1.5 bg-[#FDF8F4] hover:bg-white">📍 Cập nhật vị trí thật</button>
          {coords && <span className="text-[11px] font-mono text-[#6B6B6B]">{coords.lat.toFixed(3)}, {coords.lng.toFixed(3)} <button onClick={()=>setCoords(null)} className="underline ml-1">Xóa</button></span>}
        </div>
        {geoStatus && <div className="text-[11px] font-mono text-[#8A9A8E]">{geoStatus}</div>}
        <div className="text-[11px] text-[#9A9A9A]">Khoảng cách hiện làm mờ (“~ 3 km • vị trí thật”). Không chia sẻ sẽ hiện “Khoảng cách ẩn”.</div>
        <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Bio — như một bưu thiếp" rows={3} className="w-full rounded-xl border border-[#E8DDD3] p-3 bg-[#FDF8F4]" />
        <div className="grid grid-cols-2 gap-3">
          <input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} placeholder="Nghề" className="h-11 rounded-xl border border-[#E8DDD3] px-4 bg-[#FDF8F4]" />
          <input value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} placeholder="Học vấn" className="h-11 rounded-xl border border-[#E8DDD3] px-4 bg-[#FDF8F4]" />
        </div>
      </div>

      <div className="bg-[#FFFCF8] rounded-2xl border border-[#E8DDD3] p-6 space-y-4">
        <h2 className="font-medium">Bạn tìm gì</h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["MEN", "Nam"],
            ["WOMEN", "Nữ"],
            ["EVERYONE", "Tất cả"],
          ].map(([v, l]) => (
            <button key={v} onClick={() => setPref({ ...pref, interestedIn: v })} className={`h-11 rounded-xl border text-sm font-medium ${pref.interestedIn === v ? "bg-[#1A1A1E] text-white" : "bg-[#FDF8F4] border-[#E8DDD3]"}`}>
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
            <button key={v} onClick={()=>setPref({...pref, intent:v})} className={`px-3 py-1.5 rounded-full text-xs border ${pref.intent===v ? "bg-[#C96442] text-white border-[#C96442]" : "bg-white border-[#E8DDD3]"}`}>{l}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm">Từ <input type="number" value={pref.minAge} onChange={(e) => setPref({ ...pref, minAge: Number(e.target.value) })} className="w-full h-10 rounded-xl border border-[#E8DDD3] px-3 mt-1 bg-[#FDF8F4]" /></label>
          <label className="text-sm">Đến <input type="number" value={pref.maxAge} onChange={(e) => setPref({ ...pref, maxAge: Number(e.target.value) })} className="w-full h-10 rounded-xl border border-[#E8DDD3] px-3 mt-1 bg-[#FDF8F4]" /></label>
        </div>
        <label className="space-y-1">
          <span className="text-sm font-medium">Bán kính tối đa: {pref.maxDistance} km</span>
          <input type="range" min={5} max={200} step={5} value={pref.maxDistance} onChange={(e)=>setPref({...pref, maxDistance:Number(e.target.value)})} className="w-full accent-[#8A9A8E]" />
        </label>
      </div>

      <button onClick={save} disabled={saving} className="w-full h-12 rounded-full bg-[#C96442] text-white font-medium disabled:opacity-50">
        {saving ? "Đang lưu..." : "Lưu thay đổi"}
      </button>

      <div className="bg-[#FFFCF8] rounded-2xl border border-[#E8DDD3] p-6 space-y-3">
        <h2 className="font-medium">Tài khoản</h2>
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">Khu vực nguy hiểm — xóa sẽ ẩn hồ sơ và chặn đăng nhập lại bằng email này.</div>
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
          className="w-full h-11 rounded-full border border-red-200 text-red-600 bg-red-50 font-medium text-sm"
        >
          Xóa tài khoản
        </button>
        <div className="text-[11px] font-mono text-[#9A9A9A] text-center">
          Email: {user.email} · ID: {user.id.slice(0, 8)}
        </div>
      </div>

      <div className="text-center text-xs font-mono text-[#9A9A9A] pb-4">
        <a href="/admin" className="hover:underline">Admin</a> · <a href="/privacy" className="hover:underline">Privacy</a>
      </div>
    </div>
  );
}
