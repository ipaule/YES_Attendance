"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { X } from "lucide-react";

interface ToastItem {
  id: number;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

// Single shared snackbar/toast surface, replacing the per-page hand-rolled
// snackbars. Mounted once in dashboard/layout.tsx. bottom-20 on mobile
// clears MobileNav (fixed bottom-0); lg:bottom-4 once that bar is gone.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-20 lg:bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-2 bg-gray-900 text-white text-sm rounded-lg pl-4 pr-2 py-2 shadow-lg"
          >
            <span>{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="닫기"
              className="text-gray-400 hover:text-white p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
