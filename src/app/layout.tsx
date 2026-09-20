import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-display", style: ["normal", "italic"], display: "swap", weight: ["300", "400", "500", "600", "700"] });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Lumen — Letters, not swipes",
  description: "20 bưu thiếp mỗi ngày. Đọc chậm, trả lời bằng một dòng thật lòng.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${jakarta.variable} ${fraunces.variable} ${mono.variable} h-full`}>
      <body className="min-h-full bg-[#FFF7F5] text-[#2E1A22] antialiased selection:bg-[#FFD6DE]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
