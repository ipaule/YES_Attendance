"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Plus, Users, ClipboardList } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface TeamSummary {
  id: string;
  name: string;
  groupId: string;
  group: { id: string; name: string };
  leader: { id: string; username: string } | null;
  _count: { members: number };
}

export default function GroupPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["teams", groupId],
    queryFn: async (): Promise<TeamSummary[]> => {
      const res = await fetch(`/api/teams?groupId=${groupId}`);
      if (!res.ok) throw new Error("Failed to fetch teams");
      const data = await res.json();
      return data.teams;
    },
  });

  const addTeamMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, groupId }),
      });
      if (!res.ok) throw new Error("Failed to create team");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", groupId] });
      setShowAddTeam(false);
      setNewTeamName("");
    },
  });

  const groupName = data?.[0]?.group?.name || "";
  const canAddTeam =
    user?.role === "PASTOR" || user?.role === "EXECUTIVE";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">
          {groupName} 그룹 현황
        </h1>
        {canAddTeam && (
          <button
            onClick={() => setShowAddTeam(!showAddTeam)}
            className="flex items-center gap-1 text-sm bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            조 추가
          </button>
        )}
      </div>

      {showAddTeam && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-3">
          <input
            type="text"
            placeholder="조 이름 (예: 1조)"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTeamName) {
                addTeamMutation.mutate(newTeamName);
              }
            }}
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => newTeamName && addTeamMutation.mutate(newTeamName)}
            disabled={!newTeamName || addTeamMutation.isPending}
            className="text-sm bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 disabled:opacity-50"
          >
            추가
          </button>
          <button
            onClick={() => setShowAddTeam(false)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            취소
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.map((team) => (
          <Link
            key={team.id}
            href={`/dashboard/team/${team.id}`}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">{team.name}</h3>
              <ClipboardList className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Users className="h-4 w-4" />
                <span>멤버 {team._count.members}명</span>
              </div>
              {team.leader && (
                <p className="text-sm text-gray-500">
                  순장: {team.leader.username}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {(!data || data.length === 0) && (
        <div className="text-center py-12 text-gray-400">
          <p>아직 조가 없습니다.</p>
          {canAddTeam && (
            <p className="text-sm mt-1">
              위의 &quot;조 추가&quot; 버튼을 클릭하여 조를 만드세요.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
