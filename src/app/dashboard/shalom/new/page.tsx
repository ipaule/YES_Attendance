"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ShalomProfileForm, emptyShalomProfile, type ShalomProfileData } from "@/components/ShalomProfileForm";

export default function ShalomNewPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async (data: ShalomProfileData) => {
      const res = await fetch(`/api/shalom`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "추가 실패");
      return json.member as { id: string };
    },
    onSuccess: (member) => {
      setSaveError(null);
      queryClient.invalidateQueries({ queryKey: ["shalom-members"] });
      router.replace(`/dashboard/shalom/${member.id}`);
    },
    onError: (e: Error) => setSaveError(e.message),
  });

  return (
    <ShalomProfileForm
      initial={emptyShalomProfile()}
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
