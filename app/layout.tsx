import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import AutoRefresh from "@/components/Client/AutoRefresh";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: "Shared Pantry",
  description: "Shared grocery lists with live price lookup.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", dmSans.variable, dmSerif.variable, jetBrainsMono.variable, "font-sans")}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <AutoRefresh />
      </body>
    </html>
  );
}
