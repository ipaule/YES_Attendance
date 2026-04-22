"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RosterProfileForm, type RosterProfileData } from "@/components/RosterProfileForm";

export default function RosterDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["roster-detail", id],
    queryFn: async () => {
      const res = await fetch(`/api/roster/${id}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed");
      }
      return (await res.json()).member as RosterProfileData & { id: string };
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (patch: RosterProfileData) => {
      const res = await fetch(`/api/roster/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "저장 실패");
      return json.member as RosterProfileData;
    },
    onSuccess: () => {
      setSaveError(null);
      queryClient.invalidateQueries({ queryKey: ["roster-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["roster"] });
      queryClient.invalidateQueries({ queryKey: ["unregistered"] });
    },
    onError: (e: Error) => setSaveError(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">해당 인원을 찾을 수 없습니다.</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-sm text-indigo-600 hover:text-indigo-800"
        >
          뒤로
        </button>
      </div>
    );
  }

  return (
    <RosterProfileForm
      initial={data}
      mode="view"
      saving={saveMutation.isPending}
      saveError={saveError}
      onSave={async (patch) => {
        await saveMutation.mutateAsync(patch);
      }}
      onCancel={() => router.back()}
    />
  );
}
