"use client";
import { useI18n } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/dictionaries";

export default function LanguageSwitcher({
  variant = "pill",
  className = "",
}: {
  variant?: "pill" | "compact" | "glass";
  className?: string;
}) {
  const { locale, setLocale } = useI18n();

  const itemCls = (active: boolean) =>
    active
      ? "bg-[#2E1A22] text-white shadow-sm"
      : "text-[#8E6B75] hover:bg-white hover:text-[#2E1A22]";

  if (variant === "compact") {
    return (
      <div className={`inline-flex items-center rounded-full border border-[#FCE8EC] bg-white p-1 gap-1 ${className}`}>
        {(["vi", "en"] as Locale[]).map((l) => (
          <button
            key={l}
            onClick={() => setLocale(l)}
            aria-pressed={locale === l}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${itemCls(locale === l)}`}
          >
            {l === "vi" ? "VI" : "EN"}
          </button>
        ))}
      </div>
    );
  }

  if (variant === "glass") {
    return (
      <div className={`inline-flex items-center rounded-full glass border border-white/60 p-1 gap-1 shadow-sm ${className}`}>
        {(["vi", "en"] as Locale[]).map((l) => (
          <button
            key={l}
            onClick={() => setLocale(l)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${itemCls(locale === l)}`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  // pill default - matches existing design system
  return (
    <div className={`inline-flex items-center rounded-full bg-white/80 backdrop-blur border border-[#FCE8EC] p-1 gap-1 shadow-sm ${className}`} title="Language / Ngôn ngữ">
      <button
        onClick={() => setLocale("vi")}
        className={`px-3 py-1 rounded-full text-xs font-semibold transition flex items-center gap-1 ${locale === "vi" ? "bg-[#2E1A22] text-white" : "text-[#8E6B75] hover:bg-[#FFF0F3]"}`}
      >
        🇻🇳 VI
      </button>
      <button
        onClick={() => setLocale("en")}
        className={`px-3 py-1 rounded-full text-xs font-semibold transition flex items-center gap-1 ${locale === "en" ? "bg-[#2E1A22] text-white" : "text-[#8E6B75] hover:bg-[#FFF0F3]"}`}
      >
        🇬🇧 EN
      </button>
    </div>
  );
}
