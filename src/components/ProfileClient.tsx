"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { useI18n } from "@/lib/i18n/context";
import { usePopup } from "@/components/ui/PopupProvider";

export default function ProfileClient({ user }: { user: any }) {
  const { t, trans, locale } = useI18n();
  const { toast, confirm, prompt } = usePopup();
  const promptQs = (t.profile.promptQuestions as unknown as string[]) ?? [];
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
    verifiedOnly: (user.preferences as any)?.verifiedOnly ?? false,
    hasVoiceOnly: (user.preferences as any)?.hasVoiceOnly ?? false,
    hasPhotoOnly: (user.preferences as any)?.hasPhotoOnly ?? false,
  });
  const [extra, setExtra] = useState({
    height: (user as any).height ?? "",
    languages: (()=>{ try{ return (user as any).languages ? JSON.parse((user as any).languages).join(", ") : ""}catch{return ""}})(),
    religion: (user as any).religion ?? "",
    wantKids: (user as any).wantKids ?? "",
    smoking: (user as any).smoking ?? "",
    drinking: (user as any).drinking ?? "",
  });
  const [isIncognito, setIsIncognito] = useState((user as any).isIncognito ?? false);
  const [stamps, setStamps] = useState((user as any).stamps ?? 3);
  const [verifyStatus, setVerifyStatus] = useState((user as any).verificationStatus ?? "NONE");
  const isVerified = (user as any).isVerified ?? false;
  const isAdmin = (user as any).isAdmin ?? false;
  const [coords, setCoords] = useState<{ lat:number; lng:number } | null>(
    user.profile?.latitude != null && user.profile?.longitude != null ? { lat: user.profile.latitude, lng: user.profile.longitude } : null
  );
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<any[]>(user.promptAnswers ?? []);
  const [newPromptQ, setNewPromptQ] = useState(promptQs[0] ?? "");
  const [newPromptA, setNewPromptA] = useState("");
  const [photos, setPhotos] = useState<any[]>(user.photos ?? []);
  const [saving, setSaving] = useState(false);
  const [dailyQ, setDailyQ] = useState<string | null>(null);
  const [dailyA, setDailyA] = useState("");
  const [voiceUrl, setVoiceUrl] = useState(user.profile?.voiceUrl ?? null);

  // load once
  if (dailyQ === null) { fetch("/api/daily-answer").then(r=>r.json()).then(d=>{ setDailyQ(d.question); setDailyA(d.answer??"");}).catch(()=>{}); }

  async function requestGeo(){
    if(!navigator.geolocation){ setGeoStatus(t.profile.geoNotSupported); return; }
    setGeoStatus(t.profile.fetchingLocation);
    navigator.geolocation.getCurrentPosition(
      pos=>{ setCoords({lat:pos.coords.latitude, lng:pos.coords.longitude}); setGeoStatus(trans("profile.fetchedLocation", { lat: pos.coords.latitude.toFixed(4), lng: pos.coords.longitude.toFixed(4), acc: String(Math.round(pos.coords.accuracy)) })); },
      err=> setGeoStatus(trans("profile.fetchError", { msg: err.message })),
      { enableHighAccuracy:false, timeout:8000 }
    );
  }

  async function save() {
    setSaving(true);
    const langs = extra.languages.split(",").map((s:string)=>s.trim()).filter(Boolean);
    await fetch("/api/profile/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, interests: form.interests, preferences: pref, promptAnswers: prompts.map((p:any)=>({question:p.question, answer:p.answer})), latitude: coords?.lat ?? null, longitude: coords?.lng ?? null, isIncognito, height: extra.height ? Number(extra.height) : null, languages: langs, religion: extra.religion || null, wantKids: extra.wantKids || null, smoking: extra.smoking || null, drinking: extra.drinking || null }),
    });
    if (dailyQ && dailyA.trim().length >= 4) {
      await fetch("/api/daily-answer", { method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ answer: dailyA }) });
    }
    setSaving(false);
    toast(t.profile.saved, "success");
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    const res = await fetch("/api/profile/photos", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) { setPhotos((p) => [...p, data.photo]); toast("Đã tải ảnh", "success"); }
    else toast(data.error ?? t.profile.uploadError, "error");
  }

  async function addPrompt() {
    if (!newPromptA.trim() || prompts.length >=3) return;
    const res = await fetch("/api/prompts", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ question: newPromptQ, answer: newPromptA }) });
    const d = await res.json();
    if (res.ok) { setPrompts((p)=>[...p, d.answer]); setNewPromptA(""); toast("Đã thêm", "success"); }
    else toast(d.error, "error");
  }

  const inputClass = "w-full h-10 md:h-11 rounded-2xl border border-[#FCE8EC] px-3 md:px-4 bg-white/70 focus:bg-white focus:border-[#FF8FA3] outline-none text-sm transition placeholder:text-[#B08A95]";
  const card = "glass-strong rounded-[24px] md:rounded-[28px] p-4 md:p-6 space-y-3 md:space-y-4 relative overflow-hidden shrink-0";

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="shrink-0 flex items-center px-4 md:px-6 pt-4 md:pt-5 pb-3 bg-transparent">
        <h1 className="font-display text-[22px] md:text-[26px] font-medium flex items-center gap-2">{t.profile.title} <span className="text-[#FF8FA3]">♥</span></h1>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain">
        <div className="max-w-2xl mx-auto w-full px-4 md:px-6 pb-[88px] md:pb-4 space-y-4 md:space-y-5">

      <div className={card}>
        <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-[#FF8FA3]/10 blur-2xl pointer-events-none" />
        <h2 className="font-semibold flex items-center gap-2">{t.profile.photos} <span className="text-xs font-mono bg-[#FFF0F3] border border-[#FCE8EC] px-2 py-1 rounded-full text-[#8E6B75]">{photos.length}/6</span> <span className="ml-auto text-xs text-[#B08A95]">{t.profile.tapToDelete}</span></h2>
        <div className="grid grid-cols-3 gap-3">
          {photos.map((p) => (
            <div key={p.id} className="aspect-[3/4] rounded-[20px] overflow-hidden bg-[#FFE8EC] relative border border-white shadow-sm group">
              <img src={p.url} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition duration-500" />
              <button
                onClick={async () => {
                  const r = await fetch(`/api/profile/photos/${p.id}`, { method: "DELETE" });
                  const d = await r.json();
                  if (!r.ok) return toast(d.error, "error");
                  setPhotos((prev) => prev.filter((x) => x.id !== p.id));
                  toast("Đã xóa ảnh", "success");
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
              <span className="text-sm text-[#8E6B75] flex flex-col items-center gap-1 group-hover:text-[#FF4D6D] transition"><span className="w-8 h-8 rounded-full bg-[#FFF0F3] border border-[#FCE8EC] grid place-items-center text-lg">+</span> {t.profile.uploadPhoto}</span>
            </label>
          )}
        </div>
        <div className="rounded-2xl border border-[#FCE8EC] bg-gradient-to-br from-[#FFF0F3] to-white p-4 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full gradient-primary grid place-items-center text-white text-xs shrink-0">♪</span>
          <span className="text-sm font-semibold">{t.profile.voice}</span>
          {voiceUrl ? (
            <>
              <audio controls src={voiceUrl} className="flex-1 h-8 rounded-full" />
              <button onClick={async()=>{ await fetch("/api/profile/voice",{method:"DELETE"}); setVoiceUrl(null); toast("Đã xóa voice", "success");}} className="text-xs font-medium underline text-[#8E6B75]">{t.profile.deleteVoice}</button>
            </>
          ) : (
            <label className="ml-auto text-xs font-semibold border border-[#FCE8EC] rounded-full px-4 py-2 bg-white hover:bg-[#FFF0F3] cursor-pointer transition">
              <input type="file" accept="audio/*" className="hidden" onChange={async(e)=>{
                const f=e.target.files?.[0]; if(!f) return;
                const fd=new FormData(); fd.append("file", f); fd.append("duration","15");
                const r=await fetch("/api/profile/voice",{method:"POST", body:fd}); const d=await r.json(); if(r.ok) { setVoiceUrl(d.url); toast("Đã tải voice", "success"); } else toast(d.error, "error");
              }} />
              {t.profile.uploadVoice}
            </label>
          )}
        </div>
      </div>

      <div className={card}>
        <h2 className="font-semibold flex items-center gap-2"><span className="w-7 h-7 rounded-full bg-[#2E1A22] text-white grid place-items-center text-xs">✦</span> {t.profile.dailyQuestion}</h2>
        {dailyQ ? (
          <div className="space-y-3">
            <div className="rounded-2xl bg-[#2E1A22] text-white p-4 relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-16 h-16 rounded-full bg-[#FF4D6D]/15 blur-xl" />
              <div className="text-sm font-display italic relative">“{dailyQ}”</div>
            </div>
            <textarea value={dailyA} onChange={(e)=>setDailyA(e.target.value)} rows={2} placeholder={t.profile.dailyPlaceholder} className="w-full rounded-2xl border border-[#FCE8EC] p-3.5 bg-white/70 focus:bg-white focus:border-[#FF8FA3] outline-none text-sm placeholder:text-[#B08A95] transition" maxLength={300} />
            <div className="text-[11px] font-mono text-[#B08A95] flex items-center gap-2"><span className={`${dailyA.length>0?"text-emerald-500":""} font-semibold`}>{dailyA.length}/300</span> — {t.profile.answeringHint}</div>
          </div>
        ) : <div className="text-sm text-[#8E6B75]">{t.profile.loadingDaily}</div>}
      </div>

      <div className={card}>
        <h2 className="font-semibold">{t.profile.prompts} <span className="text-xs font-mono text-[#FF4D6D] bg-[#FFF0F3] border border-[#FCE8EC] px-2 py-1 rounded-full">{prompts.length}/3</span></h2>
        {prompts.map((p:any)=> (
          <div key={p.id} className="rounded-2xl border border-[#FCE8EC] bg-white p-4 flex justify-between gap-3 shadow-sm">
            <div>
              <div className="text-[11px] font-mono tracking-[0.12em] uppercase text-[#FF4D6D] font-semibold">{p.question}</div>
              <div className="text-sm font-display mt-1.5 leading-snug">{p.answer}</div>
            </div>
            <button onClick={async()=>{ await fetch(`/api/prompts?id=${p.id}`,{method:"DELETE"}); setPrompts(prev=>prev.filter((x:any)=>x.id!==p.id)); toast("Đã xóa", "success");}} className="text-xs font-medium underline text-[#8E6B75] shrink-0 hover:text-[#FF4D6D]">{t.profile.deletePromptBtn}</button>
          </div>
        ))}
        {prompts.length < 3 && (
          <div className="rounded-2xl border-2 border-dashed border-[#FCE8EC] p-4 space-y-3 bg-white/60">
            <select value={newPromptQ} onChange={(e)=>setNewPromptQ(e.target.value)} className={inputClass}>
              {promptQs.map(q=><option key={q} value={q}>{q}</option>)}
            </select>
            <textarea value={newPromptA} onChange={(e)=>setNewPromptA(e.target.value)} rows={2} placeholder={t.profile.promptPlaceholder} className="w-full rounded-2xl border border-[#FCE8EC] p-3.5 text-sm bg-white/70 focus:bg-white focus:border-[#FF8FA3] outline-none placeholder:text-[#B08A95] transition" maxLength={300} />
            <button onClick={addPrompt} disabled={!newPromptA.trim()} className="h-10 px-5 rounded-full bg-[#2E1A22] text-white text-xs font-semibold disabled:opacity-40 hover:bg-[#1F1218] transition">{t.profile.addPrompt}</button>
          </div>
        )}
      </div>

      <div className={card}>
        <h2 className="font-semibold flex items-center gap-2">{t.profile.info} <span className="ml-auto text-[11px] font-mono text-[#B08A95]">{t.profile.shownOnCard}</span></h2>
        <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder={t.profile.displayName} className={inputClass} />
        <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder={t.profile.location} className={inputClass} />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={requestGeo} className="text-xs font-semibold border border-[#FCE8EC] rounded-full px-4 py-2 bg-white hover:bg-[#FFF0F3] transition">{t.profile.updateLocation}</button>
          {coords && <span className="text-[11px] font-mono bg-white border border-[#FCE8EC] px-2.5 py-1 rounded-full text-[#8E6B75]">{coords.lat.toFixed(3)}, {coords.lng.toFixed(3)} <button onClick={()=>setCoords(null)} className="underline ml-1 hover:text-[#FF4D6D]">{t.profile.remove}</button></span>}
        </div>
        {geoStatus && <div className="text-[11px] font-mono text-[#FF4D6D] bg-[#FFF0F3] border border-[#FCE8EC] px-3 py-2 rounded-xl">{geoStatus}</div>}
        <div className="text-[11px] text-[#B08A95] bg-[#FFFCFA] border border-[#FCE8EC]/50 rounded-xl px-3 py-2">{t.profile.distanceHint}</div>
        <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder={t.profile.bioPlaceholder} rows={3} className="w-full rounded-2xl border border-[#FCE8EC] p-3.5 bg-white/70 focus:bg-white focus:border-[#FF8FA3] outline-none text-sm placeholder:text-[#B08A95] transition" />
        <div className="grid grid-cols-2 gap-3">
          <input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} placeholder={t.profile.occupation} className={inputClass} />
          <input value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} placeholder={t.profile.education} className={inputClass} />
        </div>
      </div>

      {/* Extended fields */}
      <div className={card}>
        <h2 className="font-semibold flex items-center gap-2">{(t.profile as any).extendedInfo ?? "Thông tin mở rộng"} <span className="text-xs font-mono bg-[#FFF0F3] border border-[#FCE8EC] px-2 py-1 rounded-full text-[#8E6B75]">{(t.profile as any).extendedBadge ?? "Mới"}</span></h2>
        <div className="grid grid-cols-2 gap-3">
          <input value={extra.height} onChange={(e)=>setExtra({...extra, height:e.target.value})} placeholder={(t.profile as any).height ?? "Chiều cao (cm)"} type="number" className={inputClass} />
          <input value={extra.languages} onChange={(e)=>setExtra({...extra, languages:e.target.value})} placeholder={(t.profile as any).languages ?? "Ngôn ngữ"} className={inputClass} />
          <input value={extra.religion} onChange={(e)=>setExtra({...extra, religion:e.target.value})} placeholder={(t.profile as any).religion ?? "Tôn giáo"} className={inputClass} />
          <input value={extra.wantKids} onChange={(e)=>setExtra({...extra, wantKids:e.target.value})} placeholder={(t.profile as any).wantKidsPlaceholder ?? "Muốn có con?"} className={inputClass} />
          <select value={extra.smoking} onChange={(e)=>setExtra({...extra, smoking:e.target.value})} className={inputClass}>
            <option value="">{(t.profile as any).smokingUnset ?? "Hút thuốc: chưa chọn"}</option>
            <option value="NEVER">{(t.profile as any).smokingNever ?? "Không bao giờ"}</option>
            <option value="SOCIAL">{(t.profile as any).smokingSocial ?? "Xã giao"}</option>
            <option value="OFTEN">{(t.profile as any).smokingOften ?? "Thường xuyên"}</option>
          </select>
          <select value={extra.drinking} onChange={(e)=>setExtra({...extra, drinking:e.target.value})} className={inputClass}>
            <option value="">{(t.profile as any).drinkingUnset ?? "Uống rượu: chưa chọn"}</option>
            <option value="NEVER">{(t.profile as any).drinkingNever ?? "Không"}</option>
            <option value="SOCIAL">{(t.profile as any).drinkingSocial ?? "Xã giao"}</option>
            <option value="OFTEN">{(t.profile as any).drinkingOften ?? "Thường xuyên"}</option>
          </select>
        </div>
        <label className="flex items-center gap-3 p-3 rounded-2xl border border-[#FCE8EC] bg-white cursor-pointer">
          <input type="checkbox" checked={isIncognito} onChange={(e)=>setIsIncognito(e.target.checked)} className="w-4 h-4 accent-[#FF4D6D]" />
          <div>
            <div className="text-sm font-semibold">{(t.profile as any).incognito ?? "Chế độ ẩn danh"}</div>
            <div className="text-xs text-[#8E6B75]">{(t.profile as any).incognitoDesc ?? "Ẩn khỏi khám phá"}</div>
          </div>
        </label>
        <div className="rounded-2xl border border-[#FCE8EC] bg-[#FFF0F3]/50 p-3 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full gradient-primary grid place-items-center text-white text-xs">✦</span>
          <div className="flex-1">
            <div className="text-sm font-semibold">{trans("profile.stamps" as any, { count: stamps } as any)}</div>
            <div className="text-xs text-[#8E6B75]">{(t.profile as any).stampsDesc ?? "Gửi bưu thiếp ưu tiên"}</div>
          </div>
        </div>
        <div className="rounded-2xl border border-[#FCE8EC] bg-white p-4 flex items-center gap-3">
          <span className={`w-8 h-8 rounded-full grid place-items-center text-xs ${isVerified ? 'bg-emerald-500 text-white' : 'bg-[#FFF0F3] border border-[#FCE8EC] text-[#8E6B75]'}`}>{isVerified ? '✓' : '?'}</span>
          <div className="flex-1">
            <div className="text-sm font-semibold flex items-center gap-2">{(t.profile as any).verification ?? "Xác minh"} {isVerified && <span className="text-emerald-600 text-xs">{(t.profile as any).verified ?? "✓ Đã tick xanh"}</span>}</div>
            <div className="text-xs text-[#8E6B75]">{trans("profile.verificationStatus" as any, { status: verifyStatus } as any)}</div>
          </div>
          {!isVerified && (
            <label className="text-xs font-semibold border border-[#FCE8EC] rounded-full px-4 py-2 bg-white hover:bg-[#FFF0F3] cursor-pointer transition">
              <input type="file" accept="image/*" className="hidden" onChange={async(e)=>{
                const f=e.target.files?.[0]; if(!f) return;
                const r=await fetch("/api/verification", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({photoUrl: URL.createObjectURL(f)})});
                if(r.ok) { toast((t.profile as any).verificationSubmitted ?? "Đã gửi yêu cầu xác minh", "success"); setVerifyStatus("PENDING"); } else { const d=await r.json(); toast(d.error, "error"); }
              }} />
              {(t.profile as any).sendVerification ?? "Gửi xác minh"}
            </label>
          )}
        </div>
      </div>

      <div className={card}>
        <h2 className="font-semibold">{t.profile.preferences}</h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["MEN", t.profile.men],
            ["WOMEN", t.profile.women],
            ["EVERYONE", t.profile.everyone],
          ].map(([v, l]) => (
            <button key={v} onClick={() => setPref({ ...pref, interestedIn: v })} className={`h-11 rounded-2xl border text-sm font-semibold transition ${pref.interestedIn === v ? "bg-[#2E1A22] text-white border-[#2E1A22] shadow-[0_4px_12px_rgba(46,26,34,0.15)]" : "bg-white border-[#FCE8EC] text-[#8E6B75] hover:border-[#FFD6DE]"}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ["LONG_TERM", t.profile.intentLong],
            ["SHORT_TERM", t.profile.intentShort],
            ["FRIENDSHIP", t.profile.intentFriend],
            ["EXPLORING", t.profile.intentExploring],
            ["UNSURE", t.profile.intentUnsure],
          ].map(([v,l])=>(
            <button key={v} onClick={()=>setPref({...pref, intent:v})} className={`px-4 py-2 rounded-full text-xs font-semibold border transition ${pref.intent===v ? "gradient-primary text-white border-transparent shadow-[0_4px_12px_rgba(255,77,109,0.25)]" : "bg-white border-[#FCE8EC] text-[#8E6B75] hover:border-[#FFD6DE]"}`}>{l}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm font-medium">{t.profile.minAge} <input type="number" value={pref.minAge} onChange={(e) => setPref({ ...pref, minAge: Number(e.target.value) })} className={`${inputClass} mt-1.5`} /></label>
          <label className="text-sm font-medium">{t.profile.maxAge} <input type="number" value={pref.maxAge} onChange={(e) => setPref({ ...pref, maxAge: Number(e.target.value) })} className={`${inputClass} mt-1.5`} /></label>
        </div>
        <label className="space-y-2 block">
          <span className="text-sm font-semibold flex items-center gap-2">{trans("profile.radius", { value: pref.maxDistance })} <span className="ml-auto text-xs font-mono text-[#B08A95]">{t.profile.radiusHint}</span></span>
          <input type="range" min={5} max={200} step={5} value={pref.maxDistance} onChange={(e)=>setPref({...pref, maxDistance:Number(e.target.value)})} className="w-full accent-[#FF4D6D]" />
        </label>
        <div className="space-y-2 pt-2 border-t border-[#FCE8EC]/60">
          <div className="text-xs font-semibold text-[#8E6B75]">{(t.profile as any).advancedFilters ?? "Bộ lọc nâng cao"}</div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pref.verifiedOnly} onChange={(e)=>setPref({...pref, verifiedOnly:e.target.checked})} className="accent-[#FF4D6D]" /> {(t.profile as any).verifiedOnly ?? "Chỉ hiện người đã xác minh"}</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pref.hasVoiceOnly} onChange={(e)=>setPref({...pref, hasVoiceOnly:e.target.checked})} className="accent-[#FF4D6D]" /> {(t.profile as any).hasVoiceOnly ?? "Chỉ hiện người có voice"}</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pref.hasPhotoOnly} onChange={(e)=>setPref({...pref, hasPhotoOnly:e.target.checked})} className="accent-[#FF4D6D]" /> {(t.profile as any).hasPhotoOnly ?? "Chỉ hiện người có ảnh"}</label>
        </div>
      </div>

      <button onClick={save} disabled={saving} className="w-full h-[52px] rounded-full btn-primary font-semibold disabled:opacity-50 shadow-[0_8px_20px_rgba(255,77,109,0.28)]">
        {saving ? t.profile.saving : t.profile.saveChanges}
      </button>

      <div className="glass rounded-[24px] p-6 space-y-3 border border-red-100">
        <h2 className="font-semibold text-[#8E2C3A] flex items-center gap-2">{t.profile.dangerZone} <span className="text-xs font-mono bg-red-50 border border-red-200 px-2 py-1 rounded-full">{t.profile.dangerBadge}</span></h2>
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 leading-relaxed">{t.profile.dangerDesc}</div>
        {isAdmin && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-white grid place-items-center text-[11px]">⚠</span>
            <span>Tài khoản Admin không thể xóa — hãy liên hệ owner hoặc hạ quyền admin trước.</span>
          </div>
        )}
        <button
          disabled={isAdmin}
          onClick={async () => {
            if (isAdmin) { toast("Admin không thể xóa tài khoản", "error"); return; }
            const ok = await confirm({ title: t.profile.deleteConfirm, variant: "danger", confirmText: t.profile.deleteAccount, cancelText: t.common.cancel });
            if (!ok) return;
            const typed = await prompt({ title: trans("profile.deleteAccountPrompt", { email: user.email }), placeholder: user.email, confirmText: t.common.confirm, cancelText: t.common.cancel });
            if (typed === null) return;
            if (typed.trim().toLowerCase() !== user.email.toLowerCase()) {
              toast(t.profile.deleteMismatch, "error");
              return;
            }
            const res = await fetch("/api/profile/me", { method: "DELETE" });
            if (!res.ok) {
              const d = await res.json().catch(()=>({}));
              toast(d.error === "ADMIN_CANNOT_DELETE" ? "Admin không thể xóa tài khoản" : d.error || "Xóa thất bại", "error");
              return;
            }
            toast("Tài khoản đã xóa", "success");
            await signOut({ callbackUrl: "/" });
          }}
          className={`w-full h-11 rounded-full border font-semibold text-sm transition ${isAdmin ? "border-zinc-200 text-zinc-400 bg-zinc-100 cursor-not-allowed" : "border-red-200 text-red-600 bg-red-50 hover:bg-red-100"}`}
          title={isAdmin ? "Admin không thể xóa tài khoản" : undefined}
        >
          {t.profile.deleteAccount} {isAdmin && "(Đã vô hiệu hóa)"}
        </button>
        <div className="text-[11px] font-mono text-[#B08A95] text-center">
          {trans("profile.accountMeta", { email: user.email, id: user.id.slice(0, 8) })}
        </div>
      </div>

      <div className="text-center text-xs font-mono text-[#B08A95] pb-2">
        <a href="/admin" className="hover:text-[#2E1A22] hover:underline">{t.profile.adminLink}</a> · <a href="/privacy" className="hover:text-[#2E1A22] hover:underline">{t.common.privacy}</a> · Lumen ♥
      </div>
        </div>
      </div>
    </div>
  );
}
