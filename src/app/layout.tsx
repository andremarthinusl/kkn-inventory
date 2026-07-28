import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  themeColor: "#1d4ed8",
};

export const metadata: Metadata = {
  title: "KKN Logistics - Inventory & Event Management",
  description: "Aplikasi manajemen inventaris dan logistik KKN",
  manifest: "/manifest.json",
  icons: {
    icon: "/iconkkn.jpeg",
    apple: "/iconkkn.jpeg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KKN Logistics",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}