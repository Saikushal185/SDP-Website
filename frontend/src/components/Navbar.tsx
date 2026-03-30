"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import { buttonClasses, cx, SiteContainer, StatusPill } from "@/components/site/ui";

const navItems = [
  { name: "Overview", path: "/" },
  { name: "Run Analysis", path: "/upload" },
  { name: "Prediction", path: "/prediction" },
  { name: "Explainability", path: "/explainability" },
  { name: "Performance", path: "/performance" },
  { name: "Methodology", path: "/about" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`);

  return (
    <nav className="sticky top-0 z-50 border-b border-[rgba(17,33,38,0.08)] bg-[rgba(248,245,239,0.76)] backdrop-blur-xl">
      <SiteContainer>
        <div className="flex min-h-[70px] items-center justify-between gap-3 sm:min-h-[78px]">
          <Link href="/" className="min-w-0 flex-1 pr-2">
            <span className="block font-display text-[1.08rem] leading-[1.02] text-[var(--text-strong)] sm:hidden">
              Parkinson&apos;s Voice
              <br />
              Research Platform
            </span>
            <span className="hidden font-display text-lg text-[var(--text-strong)] sm:block">
              Parkinson&apos;s Voice Research Platform
            </span>
          </Link>

          <div className="hidden items-center gap-2 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={cx(
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  isActive(item.path)
                    ? "bg-[rgba(29,72,80,0.12)] text-[var(--accent-strong)]"
                    : "text-[var(--text-muted)] hover:bg-[rgba(17,33,38,0.05)] hover:text-[var(--text-strong)]"
                )}
              >
                {item.name}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <StatusPill tone="positive">Explainable workflow</StatusPill>
            <button className={buttonClasses("secondary")} type="button">
              Login
            </button>
          </div>

          <button
            className="rounded-full border border-[var(--border-subtle)] bg-white/70 p-2.5 text-[var(--text-strong)] lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <FaTimes size={22} /> : <FaBars size={22} />}
          </button>
        </div>
      </SiteContainer>

      {mobileOpen && (
        <div className="border-t border-[var(--border-subtle)] bg-[rgba(248,245,239,0.95)] lg:hidden">
          <SiteContainer className="space-y-2 py-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setMobileOpen(false)}
                className={cx(
                  "block rounded-2xl px-4 py-3 text-sm font-medium transition",
                  isActive(item.path)
                    ? "bg-[rgba(29,72,80,0.12)] text-[var(--accent-strong)]"
                    : "bg-white/60 text-[var(--text-muted)]"
                )}
              >
                {item.name}
              </Link>
            ))}
            <div className="flex items-center justify-between gap-3 pt-2">
              <StatusPill tone="positive">Explainable workflow</StatusPill>
              <button className={buttonClasses("secondary")} type="button">
                Login
              </button>
            </div>
          </SiteContainer>
        </div>
      )}
    </nav>
  );
}
