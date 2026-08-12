"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, ArrowUpDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { chipClassFor } from "@/lib/dropdownColors";
import { fetchJson } from "@/lib/http";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import type { Role } from "@/types";

const ROLE_LABEL: Record<string, string> = { PASTOR: "사역자", EXECUTIVE: "공동체장", LEADER: "순장" };
const ROLE_ACCESS: Record<string, string> = {
  PASTOR: "모든 공동체와 관리 기능(재적, 미등록자, 리더쉽 관리 등)에 접근합니다.",
  EXECUTIVE: "자신의 공동체 전체 현황과 그래프에 접근합니다.",
  LEADER: "자신의 순 출석표에만 접근합니다.",
};

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
  const { showToast } = useToast();

  type SortKey = "username" | "role" | "group";
  type SortDir = "none" | "asc" | "desc";
  const [sortKey, setSortKey] = useState<SortKey | null>("group");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [pendingRoleChange, setPendingRoleChange] = useState<{ userId: string; username: string; fromRole: string; toRole: Role } | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<UserRecord | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<UserRecord[]> => {
      const data = await fetchJson<{ users: UserRecord[] }>("/api/users");
      return data.users;
    },
    enabled: user?.role === "PASTOR",
  });

  const { data: communityOptions = [] } = useQuery({
    queryKey: ["dropdown-options", "community"],
    queryFn: async (): Promise<{ value: string; color: string }[]> => {
      const data = await fetchJson<{ options: { value: string; color: string }[] }>(
        "/api/dropdown-options?category=community"
      );
      return data.options;
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
      setPendingRoleChange(null);
    },
    onError: () => showToast("저장 실패 — 다시 시도해주세요"),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "삭제 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setConfirmDeleteUser(null);
    },
    onError: (err) => showToast(err instanceof Error ? err.message : "삭제 실패 — 다시 시도해주세요"),
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

  const getRoleLabel = (role: string) => ROLE_LABEL[role] ?? role;

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
                      onChange={(e) => {
                        const toRole = e.target.value as Role;
                        if (toRole === u.role) return;
                        setPendingRoleChange({ userId: u.id, username: u.username, fromRole: u.role, toRole });
                      }}
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
                        onClick={() => setConfirmDeleteUser(u)}
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

      <ConfirmDialog
        open={!!pendingRoleChange}
        onOpenChange={(open) => !open && setPendingRoleChange(null)}
        title="역할 변경"
        description={
          pendingRoleChange
            ? `${pendingRoleChange.username}님의 역할을 ${getRoleLabel(pendingRoleChange.fromRole)} → ${getRoleLabel(pendingRoleChange.toRole)}(으)로 변경하시겠습니까?`
            : ""
        }
        impact={pendingRoleChange ? [ROLE_ACCESS[pendingRoleChange.toRole]] : []}
        confirmLabel="변경"
        destructive={false}
        pending={updateUserMutation.isPending}
        onConfirm={() =>
          pendingRoleChange &&
          updateUserMutation.mutate({ userId: pendingRoleChange.userId, data: { role: pendingRoleChange.toRole } })
        }
      />

      <ConfirmDialog
        open={!!confirmDeleteUser}
        onOpenChange={(open) => !open && setConfirmDeleteUser(null)}
        title="사용자 삭제"
        description={confirmDeleteUser ? `"${confirmDeleteUser.username}" 사용자를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.` : ""}
        pending={deleteUserMutation.isPending}
        onConfirm={() => confirmDeleteUser && deleteUserMutation.mutate(confirmDeleteUser.id)}
      />
    </div>
  );
}
