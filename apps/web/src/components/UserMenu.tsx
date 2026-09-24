"use client";

import Link from "next/link";
import { useRef } from "react";
import { Moon, Settings, Sun } from "lucide-react";
import type { UserDTO } from "@interview-prep/shared";
import { Avatar } from "@/components/ui";
import { toggleTheme } from "@/components/ThemeToggle";

const itemClass =
  "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent [&_svg]:size-4 [&_svg]:text-muted-foreground";

export function UserMenu({ user }: { user: UserDTO }) {
  const menuRef = useRef<HTMLDivElement>(null);
  const closeMenu = () => menuRef.current?.hidePopover();

  return (
    <>
      <button
        type="button"
        popoverTarget="user-menu"
        aria-label="Open menu"
        className="cursor-pointer rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
      >
        <Avatar name={user.name} email={user.email} />
      </button>
      {/* Native popover gives light-dismiss and Escape. Pinned under the avatar at the header's right edge (max-w-6xl, px-4). */}
      <div
        ref={menuRef}
        id="user-menu"
        popover="auto"
        className="bottom-auto left-auto right-[max(1rem,calc((100%_-_72rem)/2_+_1rem))] top-15 m-0 w-60 animate-enter rounded-lg border bg-card p-1 text-card-foreground shadow-lg"
      >
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium">{user.name ?? "Guest"}</p>
        </div>
        <div className="-mx-1 my-1 h-px bg-border" />
        <Link href="/settings" onClick={closeMenu} className={itemClass}>
          <Settings /> Settings
        </Link>
        <button type="button" onClick={toggleTheme} className={itemClass}>
          <Moon className="dark:hidden" />
          <Sun className="hidden dark:block" />
          <span className="dark:hidden">Dark mode</span>
          <span className="hidden dark:inline">Light mode</span>
        </button>
      </div>
    </>
  );
}
