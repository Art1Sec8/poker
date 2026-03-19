import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Poker Trainer",
  description: "Master Texas Hold'em and Pot-Limit Omaha with AI-powered coaching",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0d0d0d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          {children}
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}

function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-gold/10 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
        <NavItem href="/" icon="🏠" label="Home" />
        <NavItem href="/quiz" icon="🎯" label="Quiz" />
        <NavItem href="/ranges" icon="📊" label="Ranges" />
        <NavItem href="/equity" icon="📈" label="Equity" />
        <NavItem href="/play" icon="🃏" label="Play" />
      </div>
    </nav>
  );
}

function NavItem({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a
      href={href}
      className="flex flex-col items-center gap-0.5 text-gold-light/60 hover:text-gold transition-colors"
    >
      <span className="text-xl">{icon}</span>
      <span className="text-[10px] font-medium tracking-wide uppercase">{label}</span>
    </a>
  );
}
