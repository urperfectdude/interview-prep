"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Plus } from "lucide-react";
import type { UserDTO } from "@interview-prep/shared";
import { buttonVariants } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { UserMenu } from "@/components/UserMenu";
import { apiFetch } from "@/lib/api";

// Landing and login are public and bring their own minimal chrome; /api/me would 401-redirect them.
const PUBLIC_PATHS = ["/", "/login"];

export function AppHeader() {
  const pathname = usePathname();
  const isPublicPage = PUBLIC_PATHS.includes(pathname);
  const [user, setUser] = useState<UserDTO | null>(null);

  useEffect(() => {
    if (isPublicPage) return;
    apiFetch("/api/me")
      .then((res) => (res.ok ? (res.json() as Promise<UserDTO>) : null))
      .then(setUser)
      .catch((err) => console.warn("Failed to load profile:", err));
  }, [isPublicPage]);

  if (isPublicPage) return null;

  const isDashboard = pathname === "/dashboard";

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <Link
          href="/dashboard"
          aria-label="Dashboard"
          aria-current={isDashboard ? "page" : undefined}
          className={`${buttonVariants({ variant: "ghost", size: "sm" })} ${
            isDashboard ? "bg-accent text-accent-foreground" : "text-muted-foreground"
          }`}
        >
          <LayoutDashboard />
          <span className="hidden sm:inline">Dashboard</span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <Link href="/new" aria-label="New interview" className={buttonVariants({ size: "sm" })}>
            <Plus />
            <span className="hidden sm:inline">New interview</span>
          </Link>
          {user ? (
            <UserMenu user={user} />
          ) : (
            <span aria-hidden className="size-8 animate-pulse rounded-full bg-muted" />
          )}
        </div>
      </div>
    </header>
  );
}
