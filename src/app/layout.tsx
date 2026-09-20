import type { Metadata } from "next";
import { Inter, Newsreader, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-display", style: ["normal", "italic"], display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Lumen — Letters, not swipes",
  description: "20 bưu thiếp mỗi ngày. Đọc chậm, trả lời bằng một dòng thật lòng.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${inter.variable} ${newsreader.variable} ${mono.variable} h-full`}>
      <body className="min-h-full bg-[#FDF8F4] text-[#1A1A1E] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
