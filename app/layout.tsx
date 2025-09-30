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
  title: "Moneta",
  description: "moneymoneymoneymoneymoneymoneymoneymoney",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="px-8 py-4 flex border-b border-border">
          <h1 className="text-3xl font-bold">Moneta</h1>
        </header>
        <main className="px-8 py-4">{children}</main>
      </body>
    </html>
  );
}
