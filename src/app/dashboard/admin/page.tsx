"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { Role } from "@/types";

interface UserRecord {
  id: string;
  username: string;
  role: string;
  groupId: string;
  teamId: string | null;
  group: { id: string; name: string };
  team: { id: string; name: string } | null;
  createdAt: string;
}

export default function AdminPage() {
  const { user } = useAuth();
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

  const updateRoleMutation = useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: Role;
    }) => {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Failed to update role");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: async ({
      userId,
      groupId,
    }: {
      userId: string;
      groupId: string;
    }) => {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      });
      if (!res.ok) throw new Error("Failed to update group");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

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
      case "PASTOR":
        return "목사님";
      case "EXECUTIVE":
        return "임원";
      case "LEADER":
        return "순장";
      default:
        return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "PASTOR":
        return "bg-purple-100 text-purple-700";
      case "EXECUTIVE":
        return "bg-blue-100 text-blue-700";
      case "LEADER":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      <h1 className="text-xl font-bold text-gray-900">사용자 관리</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  아이디
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">
                  역할
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">
                  그룹
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">
                  담당 조
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">
                  역할 변경
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">
                  그룹 변경
                </th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {u.username}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${getRoleBadgeColor(u.role)}`}
                    >
                      {getRoleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {u.group?.name}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {u.team?.name || "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <select
                      value={u.role}
                      onChange={(e) =>
                        updateRoleMutation.mutate({
                          userId: u.id,
                          role: e.target.value as Role,
                        })
                      }
                      disabled={u.id === user?.id}
                      className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      <option value="LEADER">순장</option>
                      <option value="EXECUTIVE">임원</option>
                      <option value="PASTOR">목사님</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <select
                      value={u.groupId}
                      onChange={(e) =>
                        updateGroupMutation.mutate({
                          userId: u.id,
                          groupId: e.target.value,
                        })
                      }
                      className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {groups?.map(
                        (g: { id: string; name: string }) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        )
                      )}
                    </select>
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
