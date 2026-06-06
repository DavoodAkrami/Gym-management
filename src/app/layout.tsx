import type { Metadata } from "next";
import { Geist, Geist_Mono, Vazirmatn } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";
import { COLOR_THEME_STORAGE_KEY } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic", "latin"],
});

export const metadata: Metadata = {
  title: "GymManager",
  description: "AI-ready gym management for English and Persian teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-color-theme="ocean"
      className={`${geistSans.variable} ${geistMono.variable} ${vazirmatn.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Script
          id="color-theme-init"
          strategy="beforeInteractive"
        >{`(function(){try{var t=localStorage.getItem("${COLOR_THEME_STORAGE_KEY}");if(t==="ocean"||t==="midnight"){document.documentElement.dataset.colorTheme=t;}}catch(e){}})();`}</Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
