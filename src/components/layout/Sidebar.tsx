"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  BarChart3,
  Users,
  FolderOpen,
  TrendingUp,
  Settings,
  LogOut,
  X,
  History,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { User, Group } from "@/types";

interface SidebarProps {
  user: User;
  onLogout: () => void;
  onClose?: () => void;
}

export function Sidebar({ user, onLogout, onClose }: SidebarProps) {
  const pathname = usePathname();

  const { data: groups } = useQuery({
    queryKey: ["groups"],
    queryFn: async (): Promise<Group[]> => {
      const res = await fetch("/api/groups");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      return data.groups;
    },
    enabled: user.role === "PASTOR",
  });

  const roleLabel =
    user.role === "PASTOR"
      ? "사역자"
      : user.role === "EXECUTIVE"
        ? "임원"
        : "순장";

  const navItems = getNavItems(user, groups || []);

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-100">
        <Link href="/dashboard" onClick={onClose}>
          <h2 className="text-lg font-bold text-gray-900 hover:text-indigo-600 transition-colors">YES 청년부</h2>
          <p className="text-xs text-gray-500">출석 관리 시스템</p>
        </Link>
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
          {roleLabel}{user.group ? ` · ${user.group.name}` : ""}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((section) => (
          <div key={section.title || "top"} className="mb-4">
            {section.title && (
              <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {section.title}
              </p>
            )}
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

function getNavItems(user: User, groups: Group[]) {
  const sections: {
    title: string;
    items: { label: string; href: string; icon: typeof ClipboardList }[];
  }[] = [];

  // 공지사항 — visible to all
  sections.push({
    title: "",
    items: [
      { label: "공지사항", href: "/dashboard/links", icon: Megaphone },
    ],
  });

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
  if (user.role === "EXECUTIVE" && user.groupId) {
    const isShalomExec = user.group?.name === "샬롬";

    sections.push({
      title: isShalomExec ? "샬롬" : "공동체 관리",
      items: [
        {
          label: isShalomExec ? "샬롬 현황" : "공동체 현황",
          href: `/dashboard/group/${user.groupId}`,
          icon: FolderOpen,
        },
        ...(isShalomExec
          ? [
              {
                label: "샬롬 리스트",
                href: "/dashboard/shalom",
                icon: ClipboardList,
              },
              {
                label: "샬롬 그래프",
                href: "/dashboard/graphs/shalom",
                icon: TrendingUp,
              },
              {
                label: "샬롬 기록",
                href: "/dashboard/shalom/history",
                icon: History,
              },
            ]
          : [
              {
                label: "공동체 그래프",
                href: `/dashboard/graphs/group/${user.groupId}`,
                icon: TrendingUp,
              },
            ]),
      ],
    });
  }

  // Pastor sections
  if (user.role === "PASTOR" && groups.length > 0) {
    const shalom = groups.find((g) => g.name === "샬롬");
    const otherGroups = groups.filter((g) => g.name !== "샬롬");

    // 전체 관리 (top)
    sections.push({
      title: "전체 관리",
      items: [
        { label: "합산 그래프", href: "/dashboard/graphs/combined", icon: BarChart3 },
        { label: "전체 리스트", href: "/dashboard/roster", icon: ClipboardList },
        { label: "리더쉽 관리", href: "/dashboard/admin", icon: Settings },
      ],
    });

    // 공동체
    sections.push({
      title: "공동체",
      items: otherGroups.map((g) => ({
        label: `${g.name} 현황`,
        href: `/dashboard/group/${g.id}`,
        icon: FolderOpen,
      })),
    });

    // 샬롬
    if (shalom) {
      sections.push({
        title: "샬롬",
        items: [
          { label: "샬롬 현황", href: `/dashboard/group/${shalom.id}`, icon: FolderOpen },
          { label: "샬롬 리스트", href: "/dashboard/shalom", icon: ClipboardList },
          { label: "샬롬 그래프", href: "/dashboard/graphs/shalom", icon: TrendingUp },
        ],
      });
    }

    // 기록
    sections.push({
      title: "기록",
      items: [
        { label: "지난 텀 기록", href: "/dashboard/history", icon: History },
        { label: "샬롬 기록", href: "/dashboard/shalom/history", icon: History },
      ],
    });
  }

  return sections;
}
