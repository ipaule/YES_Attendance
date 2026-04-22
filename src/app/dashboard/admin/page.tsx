"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, ArrowUpDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { chipClassFor } from "@/lib/dropdownColors";
import type { Role } from "@/types";

interface UserRecord {
  id: string;
  username: string;
  role: string;
  groupId: string | null;
  teamId: string | null;
  group: { id: string; name: string } | null;
  team: { id: string; name: string } | null;
  createdAt: string;
}

export default function AdminPage() {
  const { user } = useAuth();

  type SortKey = "username" | "role" | "group";
  type SortDir = "none" | "asc" | "desc";
  const [sortKey, setSortKey] = useState<SortKey | null>("group");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<UserRecord[]> => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      return data.users;
    },
    enabled: user?.role === "PASTOR",
  });

  const { data: groups } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const res = await fetch("/api/groups");
      if (!res.ok) throw new Error("Failed to fetch groups");
      const data = await res.json();
      return data.groups;
    },
  });

  const { data: communityOptions = [] } = useQuery({
    queryKey: ["dropdown-options", "community"],
    queryFn: async (): Promise<{ value: string; color: string }[]> => {
      const res = await fetch("/api/dropdown-options?category=community");
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).options;
    },
    staleTime: 30_000,
  });
  const communityColor = useMemo(() => {
    const map: Record<string, string> = {};
    for (const opt of communityOptions) map[opt.value] = opt.color;
    return map;
  }, [communityOptions]);

  const updateUserMutation = useMutation({
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: string;
      data: { role?: Role; groupId?: string };
    }) => {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const sortedUsers = useMemo(() => {
    if (!users || !sortKey || sortDir === "none") return users ?? [];
    return [...users].sort((a, b) => {
      let va = "", vb = "";
      if (sortKey === "username") { va = a.username; vb = b.username; }
      else if (sortKey === "role") { va = a.role; vb = b.role; }
      else if (sortKey === "group") {
        const groupOrder: Record<string, number> = { "믿음": 0, "소망": 1, "사랑": 2, "샬롬": 3 };
        const ia = groupOrder[a.group?.name || ""] ?? 99;
        const ib = groupOrder[b.group?.name || ""] ?? 99;
        return sortDir === "asc" ? ia - ib : ib - ia;
      }
      const cmp = va.localeCompare(vb, "ko");
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [users, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc"); }
    else setSortDir((p) => p === "desc" ? "asc" : p === "asc" ? "none" : "desc");
  };

  const sortIcon = (key: SortKey) => (
    <ArrowUpDown className={`h-3 w-3 inline-block ml-0.5 ${sortKey === key && sortDir !== "none" ? "text-indigo-600" : "text-gray-400"}`} />
  );

  if (user?.role !== "PASTOR") {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-red-500">권한이 없습니다.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "PASTOR": return "사역자";
      case "EXECUTIVE": return "공동체장";
      case "LEADER": return "순장";
      default: return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "PASTOR": return "bg-purple-100 text-purple-700";
      case "EXECUTIVE": return "bg-blue-100 text-blue-700";
      case "LEADER": return "bg-gray-100 text-gray-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">리더쉽 관리</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-2 py-3 text-center font-medium text-gray-600 w-10">#</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer select-none" onClick={() => toggleSort("username")}>이름{sortIcon("username")}</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600 cursor-pointer select-none" onClick={() => toggleSort("role")}>역할{sortIcon("role")}</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600 cursor-pointer select-none" onClick={() => toggleSort("group")}>공동체{sortIcon("group")}</th>
                <th className="px-2 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((u, idx) => (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-2 py-3 text-center text-xs text-gray-400">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{u.username}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${getRoleBadgeColor(u.role)}`}>
                        {getRoleLabel(u.role)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <select
                      value={u.role}
                      onChange={(e) =>
                        updateUserMutation.mutate({
                          userId: u.id,
                          data: { role: e.target.value as Role },
                        })
                      }
                      disabled={u.id === user?.id}
                      className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      <option value="LEADER">순장</option>
                      <option value="EXECUTIVE">공동체장</option>
                      <option value="PASTOR">사역자</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {u.group?.name ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${chipClassFor(communityColor[u.group.name])}`}>
                        {u.group.name}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-center">
                    {u.id !== user?.id && (
                      <button
                        onClick={() => {
                          if (confirm(`"${u.username}" 사용자를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
                            deleteUserMutation.mutate(u.id);
                          }
                        }}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
