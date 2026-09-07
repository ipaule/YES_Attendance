"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Bulleted list of what will be affected/lost — e.g. "순원 4명 삭제". */
  impact?: string[];
  /** If set, the confirm button stays disabled until the user types this exact text. */
  confirmWord?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  pending?: boolean;
  destructive?: boolean;
  /** When true, the confirm button is hidden entirely — there is nothing the user can do here. */
  blocked?: boolean;
}

// Generalizes the app's two ad-hoc destructive-confirm patterns (plain
// window.confirm, and history/page.tsx's multi-step typed-confirmation) into
// one Radix Dialog-based component for Phase 3's guard call sites.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  impact,
  confirmWord,
  confirmLabel = "삭제",
  onConfirm,
  pending = false,
  destructive = true,
  blocked = false,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState("");
  const canConfirm = !blocked && (!confirmWord || typed === confirmWord);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setTyped("");
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 space-y-4">
          <Dialog.Title className={`text-lg font-bold ${destructive ? "text-red-600" : "text-gray-800"}`}>
            {title}
          </Dialog.Title>
          {description && (
            <Dialog.Description className="text-sm text-gray-600 whitespace-pre-line">
              {description}
            </Dialog.Description>
          )}
          {impact && impact.length > 0 && (
            <ul className="bg-red-50 rounded-lg p-3 text-sm text-red-700 list-disc list-inside space-y-0.5">
              {impact.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          )}
          {confirmWord && (
            <div>
              <p className="text-sm text-gray-600 mb-1.5">
                확인을 위해 아래에 <span className="font-bold text-red-600">{confirmWord}</span>을(를) 입력해주세요.
              </p>
              <input
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing && canConfirm) onConfirm();
                }}
                placeholder={confirmWord}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                autoFocus
              />
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Dialog.Close asChild>
              <button className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">
                {blocked ? "닫기" : "취소"}
              </button>
            </Dialog.Close>
            {!blocked && (
              <button
                onClick={onConfirm}
                disabled={!canConfirm || pending}
                className={`text-sm text-white rounded-lg px-4 py-2 disabled:opacity-50 ${
                  destructive ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {pending ? "처리 중..." : confirmLabel}
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
