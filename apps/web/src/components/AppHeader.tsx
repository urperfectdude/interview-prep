"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { UserDTO } from "@interview-prep/shared";
import { Avatar, Button } from "@/components/ui";
import { apiFetch } from "@/lib/api";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/settings", label: "Settings" },
];

export function AppHeader() {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const [user, setUser] = useState<UserDTO | null>(null);

  useEffect(() => {
    if (isLoginPage) return;
    apiFetch("/api/me")
      .then((res) => (res.ok ? (res.json() as Promise<UserDTO>) : null))
      .then(setUser)
      .catch((err) => console.warn("Failed to load profile:", err));
  }, [isLoginPage]);

  if (isLoginPage) return null;

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
          Interview<span className="text-accent">Prep</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
                pathname === link.href ? "bg-accent-soft text-accent" : "text-muted hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button className="px-4 py-2">+ New Interview</Button>
          </Link>
          {user && (
            <Link href="/settings" aria-label="Open settings">
              <Avatar name={user.name} email={user.email} picture={user.picture} />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
