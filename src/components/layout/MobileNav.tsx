"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, BarChart3, FolderOpen, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import type { User } from "@/types";

interface MobileNavProps {
  user: User;
}

export function MobileNav({ user }: MobileNavProps) {
  const pathname = usePathname();

  const items = getMobileNavItems(user);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 lg:hidden">
      <nav className="flex justify-around py-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-1 text-xs transition-colors",
              pathname === item.href || pathname.startsWith(item.href + "/")
                ? "text-indigo-600"
                : "text-gray-400 hover:text-gray-600"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function getMobileNavItems(user: User) {
  const items: { label: string; href: string; icon: typeof ClipboardList }[] = [];

  if (user.teamId) {
    items.push({
      label: "출석표",
      href: `/dashboard/team/${user.teamId}`,
      icon: ClipboardList,
    });
    items.push({
      label: "그래프",
      href: `/dashboard/graphs/team/${user.teamId}`,
      icon: BarChart3,
    });
  }

  if (user.role === "EXECUTIVE" && user.groupId) {
    items.push({
      label: "공동체",
      href: `/dashboard/group/${user.groupId}`,
      icon: FolderOpen,
    });
  }

  if (user.role === "PASTOR") {
    items.push({
      label: "공동체",
      href: "/dashboard/groups",
      icon: FolderOpen,
    });
    items.push({
      label: "관리",
      href: "/dashboard/admin",
      icon: Settings,
    });
  }

  return items;
}
