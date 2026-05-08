import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Admin Studio - ScaleTicket",
  description: "Map Builder Studio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased bg-black text-white`}
    >
      <body className="min-h-full flex flex-col bg-black text-white selection:bg-[#DFFF00] selection:text-black">
        {children}
      </body>
    </html>
  );
}
