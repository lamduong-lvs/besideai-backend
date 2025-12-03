import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BesideAI - AI trợ lý cho Gmail, Meet và hơn thế nữa",
  description: "BesideAI kết nối Chrome Extension với backend AI mạnh mẽ, quản lý gói trả phí qua Lemon Squeezy và tối ưu chi phí Free Tier.",
  icons: {
    icon: "/favicon.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
                <Link href="/" className="flex items-center gap-2">
                  <img
                    src="/logo.png"
                    alt="BesideAI"
                    className="h-8 w-8"
                  />
                  <span className="text-lg font-semibold tracking-tight">
                    BesideAI
                  </span>
                </Link>
                <nav className="flex items-center gap-4 text-sm font-medium">
                  <a href="#features" className="hover:underline">
                    Tính năng
                  </a>
                  <Link href="/pricing" className="hover:underline">
                    Bảng giá
                  </Link>
                  <Link href="/terms" className="hover:underline">
                    Terms
                  </Link>
                  <Link href="/privacy" className="hover:underline">
                    Privacy
                  </Link>
                  <ThemeToggle />
                  <Link
                    href="/login"
                    className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    Đăng nhập
                  </Link>
                </nav>
              </div>
            </header>
            <main className="flex-1">{children}</main>
            <footer className="border-t bg-background py-4 text-center text-xs text-muted-foreground">
              © {new Date().getFullYear()} BesideAI. All rights reserved.
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
