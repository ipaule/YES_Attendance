"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  KeyRound,
  UserX,
  CalendarDays,
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
  const [showPwModal, setShowPwModal] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const handlePasswordChange = async () => {
    if (!pwCurrent || !pwNew) { setPwMsg("모든 필드를 입력해주세요."); return; }
    if (pwNew !== pwConfirm) { setPwMsg("새 비밀번호가 일치하지 않습니다."); return; }
    setPwLoading(true);
    setPwMsg("");
    try {
      const res = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      });
      const data = await res.json();
      if (!res.ok) { setPwMsg(data.error); return; }
      setPwMsg("비밀번호가 변경되었습니다.");
      setTimeout(() => { setShowPwModal(false); setPwCurrent(""); setPwNew(""); setPwConfirm(""); setPwMsg(""); }, 1500);
    } catch { setPwMsg("서버 오류가 발생했습니다."); }
    finally { setPwLoading(false); }
  };

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
        ? "공동체장"
        : "순장";

  const navItems = getNavItems(user, groups || []);

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-100">
        <Link href="/dashboard" onClick={onClose} className="flex items-center gap-2">
          <Image src="/YES_Icon.png" alt="YES" width={36} height={36} />
          <div>
            <h2 className="text-lg font-bold text-gray-900 hover:text-indigo-600 transition-colors">YES 청년부</h2>
            <p className="text-xs text-gray-500">출석 관리 시스템</p>
          </div>
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
                  pathname === item.href
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

      {/* Admin + Password + Logout */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-1">
        {user.role === "PASTOR" && (
          <Link
            href="/dashboard/admin"
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm transition-colors",
              pathname === "/dashboard/admin"
                ? "bg-indigo-50 text-indigo-700 font-medium"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <Settings className="h-4 w-4" />
            리더쉽 관리
          </Link>
        )}
        <button
          onClick={() => setShowPwModal(true)}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <KeyRound className="h-4 w-4" />
          비밀번호 변경
        </button>
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </button>
      </div>

      {/* Password change modal */}
      {showPwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 space-y-4">
            <h3 className="text-lg font-bold text-gray-800">비밀번호 변경</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">현재 비밀번호</label>
                <input type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">새 비밀번호</label>
                <input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">새 비밀번호 확인</label>
                <input type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handlePasswordChange(); }}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            {pwMsg && (
              <div className={`text-sm rounded-lg p-3 ${pwMsg.includes("변경되었습니다") ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>{pwMsg}</div>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowPwModal(false); setPwCurrent(""); setPwNew(""); setPwConfirm(""); setPwMsg(""); }} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">취소</button>
              <button onClick={handlePasswordChange} disabled={pwLoading} className="text-sm bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 disabled:opacity-50">{pwLoading ? "변경 중..." : "변경"}</button>
            </div>
          </div>
        </div>
      )}
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
        { label: "재적 리스트", href: "/dashboard/roster", icon: ClipboardList },
        { label: "미등록자 관리", href: "/dashboard/unregistered", icon: UserX },
        { label: "한주의 준비", href: "/dashboard/weekly-prep", icon: CalendarDays },
      ],
    });

    // 공동체
    const groupOrder = ["믿음", "소망", "사랑"];
    const sortedGroups = [...otherGroups].sort(
      (a, b) => groupOrder.indexOf(a.name) - groupOrder.indexOf(b.name)
    );
    sections.push({
      title: "공동체",
      items: sortedGroups.map((g) => ({
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
