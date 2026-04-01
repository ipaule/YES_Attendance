"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  BarChart3,
  Users,
  FolderOpen,
  TrendingUp,
  Settings,
  LogOut,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { User } from "@/types";

interface SidebarProps {
  user: User;
  onLogout: () => void;
  onClose?: () => void;
}

export function Sidebar({ user, onLogout, onClose }: SidebarProps) {
  const pathname = usePathname();

  const roleLabel =
    user.role === "PASTOR"
      ? "목사님"
      : user.role === "EXECUTIVE"
        ? "임원"
        : "순장";

  const navItems = getNavItems(user);

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-100">
        <div>
          <h2 className="text-lg font-bold text-gray-900">YES 청년부</h2>
          <p className="text-xs text-gray-500">출석 관리 시스템</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <p className="text-sm font-medium text-gray-900">{user.username}</p>
        <p className="text-xs text-gray-500">
          {roleLabel} · {user.group?.name || ""}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((section) => (
          <div key={section.title} className="mb-4">
            <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {section.title}
            </p>
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  pathname === item.href || pathname.startsWith(item.href + "/")
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-100">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </button>
      </div>
    </div>
  );
}

function getNavItems(user: User) {
  const sections: {
    title: string;
    items: { label: string; href: string; icon: typeof ClipboardList }[];
  }[] = [];

  // Leader: own team
  if (user.teamId) {
    sections.push({
      title: "내 출석표",
      items: [
        {
          label: "출석표",
          href: `/dashboard/team/${user.teamId}`,
          icon: ClipboardList,
        },
        {
          label: "출석 그래프",
          href: `/dashboard/graphs/team/${user.teamId}`,
          icon: BarChart3,
        },
      ],
    });
  }

  // Executive: group teams
  if (user.role === "EXECUTIVE" || user.role === "PASTOR") {
    sections.push({
      title: "그룹 관리",
      items: [
        {
          label: "그룹 현황",
          href: `/dashboard/group/${user.groupId}`,
          icon: FolderOpen,
        },
        {
          label: "그룹 그래프",
          href: `/dashboard/graphs/group/${user.groupId}`,
          icon: TrendingUp,
        },
      ],
    });
  }

  // Pastor: all groups + combined + admin
  if (user.role === "PASTOR") {
    sections.push({
      title: "전체 관리",
      items: [
        {
          label: "합산 그래프",
          href: "/dashboard/graphs/combined",
          icon: BarChart3,
        },
        {
          label: "사용자 관리",
          href: "/dashboard/admin",
          icon: Settings,
        },
        {
          label: "전체 그룹",
          href: "/dashboard/groups",
          icon: Users,
        },
      ],
    });
  }

  return sections;
}
