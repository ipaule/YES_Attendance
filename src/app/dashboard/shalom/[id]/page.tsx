"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShalomProfileForm, type ShalomProfileData } from "@/components/ShalomProfileForm";

export default function ShalomDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["shalom-detail", id],
    queryFn: async () => {
      const res = await fetch(`/api/shalom/${id}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed");
      }
      return (await res.json()).member as ShalomProfileData;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (patch: ShalomProfileData) => {
      const res = await fetch(`/api/shalom/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "저장 실패");
      return json.member as ShalomProfileData;
    },
    onSuccess: () => {
      setSaveError(null);
      queryClient.invalidateQueries({ queryKey: ["shalom-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["shalom-members"] });
    },
    onError: (e: Error) => setSaveError(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">대상을 찾을 수 없습니다.</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-indigo-600 hover:text-indigo-800">
          뒤로
        </button>
      </div>
    );
  }

  return (
    <ShalomProfileForm
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
