"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RosterProfileForm, emptyProfile, type RosterProfileData } from "@/components/RosterProfileForm";

export default function RosterNewPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async (data: RosterProfileData) => {
      const res = await fetch(`/api/roster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "추가 실패");
      return json.member as { id: string };
    },
    onSuccess: () => {
      setSaveError(null);
      queryClient.invalidateQueries({ queryKey: ["roster"] });
      queryClient.invalidateQueries({ queryKey: ["unregistered"] });
      router.replace("/dashboard/roster");
    },
    onError: (e: Error) => setSaveError(e.message),
  });

  return (
    <RosterProfileForm
      initial={emptyProfile()}
      mode="create"
      saving={createMutation.isPending}
      saveError={saveError}
      onSave={async (data) => {
        await createMutation.mutateAsync(data);
      }}
      onCancel={() => router.back()}
    />
  );
}
