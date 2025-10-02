import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Heart } from "lucide-react";

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
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <header className="px-8 py-4 border-b border-border bg-background">
          <h1 className="text-3xl">
            <Link href="/" className="text-inherit no-underline">
              Moneta
            </Link>
          </h1>
        </header>
        <main className="px-8 py-4 flex-grow">{children}</main>
        <footer className="px-8 py-4 border-t border-border bg-background">
          <p>
            Made with{" "}
            <Heart
              size={16}
              className="inline-block animate-pulse text-red-800 [animation-duration:3s]"
              aria-label="Heart icon"
            />{" "}
            by{" "}
            <a
              href="https://github.com/pythonatsea"
              className="text-blue-500 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit pythonatsea's GitHub profile (opens in new tab)"
            >
              pythonatsea
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
