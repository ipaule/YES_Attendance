"use client";

import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ClipboardList, BarChart3, FolderOpen, Settings, Megaphone, TrendingUp, History } from "lucide-react";
import type { Group } from "@/types";

export default function DashboardPage() {
  const { user, loading } = useAuth();

  const { data: groups } = useQuery({
    queryKey: ["groups"],
    queryFn: async (): Promise<Group[]> => {
      const res = await fetch("/api/groups");
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).groups;
    },
    enabled: user?.role === "PASTOR",
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (!user) return null;

  type Item = { label: string; href: string; icon: typeof ClipboardList; bg: string; iconColor: string; hover: string };
  const sections: { title: string; items: Item[] }[] = [];

  const mk = (label: string, href: string, icon: typeof ClipboardList, theme: "indigo" | "emerald" | "purple" | "amber" | "orange" | "gray"): Item => {
    const themes = {
      indigo: { bg: "bg-indigo-50", iconColor: "text-indigo-600", hover: "hover:border-indigo-300" },
      emerald: { bg: "bg-emerald-50", iconColor: "text-emerald-600", hover: "hover:border-emerald-300" },
      purple: { bg: "bg-purple-50", iconColor: "text-purple-600", hover: "hover:border-purple-300" },
      amber: { bg: "bg-amber-50", iconColor: "text-amber-600", hover: "hover:border-amber-300" },
      orange: { bg: "bg-orange-50", iconColor: "text-orange-600", hover: "hover:border-orange-300" },
      gray: { bg: "bg-gray-100", iconColor: "text-gray-600", hover: "hover:border-gray-300" },
    };
    const t = themes[theme];
    return { label, href, icon, ...t };
  };

  // 공지사항 — everyone
  sections.push({ title: "", items: [mk("공지사항", "/dashboard/links", Megaphone, "orange")] });

  if (user.role === "PASTOR" && groups) {
    const shalom = groups.find(g => g.name === "샬롬");
    const others = groups.filter(g => g.name !== "샬롬");

    sections.push({
      title: "전체 관리",
      items: [
        mk("합산 그래프", "/dashboard/graphs/combined", BarChart3, "emerald"),
        mk("전체 리스트", "/dashboard/roster", ClipboardList, "purple"),
        mk("리더쉽 관리", "/dashboard/admin", Settings, "gray"),
      ],
    });
    sections.push({
      title: "공동체",
      items: others.map(g => mk(`${g.name} 현황`, `/dashboard/group/${g.id}`, FolderOpen, "indigo")),
    });
    if (shalom) {
      sections.push({
        title: "샬롬",
        items: [
          mk("샬롬 현황", `/dashboard/group/${shalom.id}`, FolderOpen, "indigo"),
          mk("샬롬 리스트", "/dashboard/shalom", ClipboardList, "amber"),
          mk("샬롬 그래프", "/dashboard/graphs/shalom", TrendingUp, "emerald"),
        ],
      });
    }
    sections.push({
      title: "기록",
      items: [
        mk("지난 텀 기록", "/dashboard/history", History, "gray"),
        mk("샬롬 기록", "/dashboard/shalom/history", History, "gray"),
      ],
    });
  } else if (user.role === "EXECUTIVE") {
    const isShalomExec = user.group?.name === "샬롬";
    if (isShalomExec && user.groupId) {
      sections.push({
        title: "샬롬",
        items: [
          mk("샬롬 현황", `/dashboard/group/${user.groupId}`, FolderOpen, "indigo"),
          mk("샬롬 리스트", "/dashboard/shalom", ClipboardList, "amber"),
          mk("샬롬 그래프", "/dashboard/graphs/shalom", TrendingUp, "emerald"),
          mk("샬롬 기록", "/dashboard/shalom/history", History, "gray"),
        ],
      });
    } else if (user.groupId) {
      sections.push({
        title: "공동체 관리",
        items: [
          mk("공동체 현황", `/dashboard/group/${user.groupId}`, FolderOpen, "indigo"),
          mk("공동체 그래프", `/dashboard/graphs/group/${user.groupId}`, TrendingUp, "emerald"),
        ],
      });
    }
  } else {
    // Leader
    if (user.teamId) {
      sections.push({
        title: "내 출석표",
        items: [
          mk("출석표", `/dashboard/team/${user.teamId}`, ClipboardList, "indigo"),
          mk("출석 그래프", `/dashboard/graphs/team/${user.teamId}`, BarChart3, "emerald"),
        ],
      });
    } else {
      sections.push({
        title: "",
        items: [],
      });
    }
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-4">
      <h1 className="text-xl font-bold text-gray-900">YES 청년부 출석 관리</h1>

      {sections.map((section, si) => (
        <div key={si}>
          {section.title && (
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">{section.title}</h2>
          )}
          {section.items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {section.items.map((item) => (
                <Link key={item.href} href={item.href}
                  className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all flex items-center gap-3 ${item.hover}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${item.bg}`}>
                    <item.icon className={`h-4 w-4 ${item.iconColor}`} />
                  </div>
                  <h3 className="font-semibold text-sm text-gray-800">{item.label}</h3>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p>아직 배정된 순이 없습니다.</p>
              <p className="text-sm mt-1">사역자가 순을 배정해주실 때까지 기다려주세요.</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
