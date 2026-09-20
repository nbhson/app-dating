"use client";
import { SessionProvider } from "next-auth/react";
import { I18nProvider } from "@/lib/i18n/context";
import { PopupProvider } from "@/components/ui/PopupProvider";
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <I18nProvider>
        <PopupProvider>{children}</PopupProvider>
      </I18nProvider>
    </SessionProvider>
  );
}
