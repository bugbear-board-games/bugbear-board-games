import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Fredoka, Nunito } from "next/font/google";
import { getCurrentUser } from "@/lib/auth";
import { hasRole, ROLE_LABELS, type Role } from "@/lib/roles";
import { logout } from "@/actions/auth";
import "./globals.css";

const display = Fredoka({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });
const body = Nunito({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: { default: "Bugbear Board Games", template: "%s · Bugbear Board Games" },
  description: "A friendly board game community in Pittsburgh, PA. Find game nights and meet fellow players.",
  icons: { icon: "/logo.png" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <header className="site-header">
          <div className="container header-inner">
            <Link href="/" className="brand">
              <Image src="/logo.png" alt="" width={44} height={46} priority />
              <span>Bugbear <span className="brand-sub">Board Games</span></span>
            </Link>
            <nav className="nav" aria-label="Main">
              <Link href="/events">Events</Link>
              <Link href="/#about">About</Link>
              <Link href="/#contact">Contact</Link>
              {hasRole(user, "ADMIN") && <Link href="/admin">Admin</Link>}
              {user ? (
                <>
                  <Link href="/account" className="nav-user" title={ROLE_LABELS[user.role as Role]}>
                    {user.name.split(" ")[0]}
                  </Link>
                  <form action={logout}>
                    <button type="submit" className="btn btn-ghost btn-sm">Sign out</button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="btn btn-gold btn-sm">Sign in</Link>
              )}
            </nav>
          </div>
        </header>

        <main id="main">{children}</main>

        <footer className="site-footer">
          <div className="container footer-inner">
            <p>© {new Date().getFullYear()} Bugbear Board Games · Pittsburgh, PA</p>
            <p className="muted">Roll dice. Make friends.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
