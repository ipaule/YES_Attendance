"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Users, Pencil, Trash2, Check, X, ArrowLeft, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AttendanceChart } from "@/components/graphs/AttendanceChart";

interface TeamSummary {
  id: string;
  name: string;
  groupId: string;
  group: { id: string; name: string };
  leader: { id: string; username: string } | null;
  members: { id: string; name: string }[];
  _count: { members: number };
}

export default function GroupPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [selectedLeaderId, setSelectedLeaderId] = useState("");
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["teams", groupId],
    queryFn: async (): Promise<TeamSummary[]> => {
      const res = await fetch(`/api/teams?groupId=${groupId}`);
      if (!res.ok) throw new Error("Failed to fetch teams");
      const data = await res.json();
      return data.teams;
    },
  });

  const { data: availableLeaders } = useQuery({
    queryKey: ["available-leaders", groupId],
    queryFn: async () => {
      const res = await fetch(`/api/users?scope=available-leaders&groupId=${groupId}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      return data.users as { id: string; username: string }[];
    },
    enabled: showAddTeam,
  });

  const addTeamMutation = useMutation({
    mutationFn: async (leaderId: string) => {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, leaderId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create team");
      }
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", groupId] });
      queryClient.invalidateQueries({ queryKey: ["available-leaders", groupId] });
      setShowAddTeam(false);
      setSelectedLeaderId("");
    },
  });

  const editTeamMutation = useMutation({
    mutationFn: async ({ teamId, name }: { teamId: string; name: string }) => {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to update team");
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", groupId] });
      setEditingTeam(null);
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId: string) => {
      const res = await fetch(`/api/teams/${teamId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete team");
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", groupId] });
      queryClient.invalidateQueries({ queryKey: ["available-leaders", groupId] });
    },
  });

  const [graphMode, setGraphMode] = useState<"count" | "percentage">("count");
  const isShalom = data?.[0]?.group?.name === "샬롬";

  const { data: graphData } = useQuery({
    queryKey: ["graph", "group", groupId, graphMode],
    queryFn: async () => {
      const res = await fetch(`/api/graphs?scope=group&id=${groupId}&mode=${graphMode}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !isShalom && !!data,
  });

  const groupName = data?.[0]?.group?.name || "";
  const canManage = user?.role === "PASTOR";

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
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {groupName} 공동체 현황
          </h1>
        </div>
        {canManage && (
          <button
            onClick={() => setShowAddTeam(!showAddTeam)}
            className="flex items-center gap-1 text-sm bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            순 추가
          </button>
        )}
      </div>

      {showAddTeam && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-3">
          <select
            value={selectedLeaderId}
            onChange={(e) => setSelectedLeaderId(e.target.value)}
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">순장 선택</option>
            {availableLeaders?.map((leader) => (
              <option key={leader.id} value={leader.id}>
                {leader.username}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              if (selectedLeaderId && !addTeamMutation.isPending) {
                addTeamMutation.mutate(selectedLeaderId);
              }
            }}
            disabled={!selectedLeaderId || addTeamMutation.isPending}
            className="text-sm bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 disabled:opacity-50"
          >
            추가
          </button>
          <button
            onClick={() => {
              setShowAddTeam(false);
              setSelectedLeaderId("");
            }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            취소
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.map((team) => (
          <div
            key={team.id}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("[data-action]")) return;
              router.push(`/dashboard/team/${team.id}`);
            }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              {editingTeam === team.id ? (
                <div className="flex items-center gap-1 flex-1" data-action>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && editName) {
                        editTeamMutation.mutate({ teamId: team.id, name: editName });
                      }
                      if (e.key === "Escape") setEditingTeam(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm border border-indigo-300 rounded px-2 py-1 flex-1 focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => editName && editTeamMutation.mutate({ teamId: team.id, name: editName })}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setEditingTeam(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="font-semibold text-gray-800">{team.name}</span>
                  <div className="flex items-center gap-1" data-action>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/graphs/team/${team.id}`);
                      }}
                      className="text-gray-300 hover:text-emerald-500 transition-colors"
                      title="출석 그래프"
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                    </button>
                    {canManage && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTeam(team.id);
                            setEditName(team.name);
                          }}
                          className="text-gray-300 hover:text-indigo-500 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`"${team.name}" 순을 삭제하시겠습니까?`)) {
                              deleteTeamMutation.mutate(team.id);
                            }
                          }}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Users className="h-4 w-4" />
              <span>순원 {team._count.members}명</span>
            </div>
            {team.members && team.members.length > 0 && (
              <div className="mt-2 text-xs text-gray-400 leading-relaxed">
                {team.members.map((m) => m.name).join(", ")}
              </div>
            )}
          </div>
        ))}
      </div>

      {(!data || data.length === 0) && (
        <div className="text-center py-12 text-gray-400">
          <p>아직 순이 없습니다.</p>
          {canManage && (
            <p className="text-sm mt-1">
              위의 &quot;순 추가&quot; 버튼을 클릭하여 순을 만드세요.
            </p>
          )}
        </div>
      )}

      {/* Graph (non-샬롬 only) */}
      {!isShalom && graphData && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setGraphMode("count")}
                className={`text-xs px-3 py-1.5 rounded-md transition-colors ${graphMode === "count" ? "bg-white text-indigo-700 font-medium shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                출석 인원
              </button>
              <button
                onClick={() => setGraphMode("percentage")}
                className={`text-xs px-3 py-1.5 rounded-md transition-colors ${graphMode === "percentage" ? "bg-white text-indigo-700 font-medium shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                출석률
              </button>
            </div>
          </div>
          <AttendanceChart
            chartData={graphData.chartData}
            series={graphData.series}
            title={`${graphData.groupName} 공동체 ${graphMode === "count" ? "출석 인원" : "출석률"}`}
            subtitle={graphMode === "count" ? "순별 출석 인원 추이 (점선: 전체 합계)" : "순별 출석률 추이 (점선: 공동체 전체 평균)"}
            mode={graphMode}
          />
        </div>
      )}
    </div>
  );
}
