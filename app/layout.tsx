import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "الفيوم للأعلاف والدواجن | إدارة الطلبات",
  description: "نظام إدارة الطلبات والأصناف للفيوم للأعلاف والدواجن",
  manifest: "/manifest.webmanifest",
  icons: { apple: "/apple-icon", icon: "/icon" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "الفيوم للأعلاف" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
