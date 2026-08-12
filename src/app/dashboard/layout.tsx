"use client";

import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { ToastProvider } from "@/components/Toast";

const HELP_BANNER_KEY = "yes-attendance:seen-help-banner";

// Read in an effect (never during render) both to avoid an SSR/CSR
// hydration mismatch and to respect the project's react-hooks/refs rule —
// this is the "adjust state during render" alternative for a value that
// can only be known client-side.
function FirstLoginBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // One-time mount check of a client-only source, not a value derived
    // from props/state — nothing to "avoid this effect" for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!localStorage.getItem(HELP_BANNER_KEY)) setShow(true);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(HELP_BANNER_KEY, "1");
    setShow(false);
  };

  return (
    <div className="flex items-center justify-between gap-3 bg-indigo-50 border-b border-indigo-100 px-4 py-2 text-sm text-indigo-800">
      <span>
        처음 오셨나요?{" "}
        <Link href="/dashboard/help" className="font-medium underline hover:text-indigo-900">
          사용 안내
        </Link>
        에서 기능을 확인해보세요.
      </span>
      <button onClick={dismiss} aria-label="닫기" className="text-indigo-400 hover:text-indigo-600 flex-shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
          <Sidebar user={user} onLogout={logout} />
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="fixed inset-0 bg-black/30"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 w-64 z-50">
              <Sidebar
                user={user}
                onLogout={logout}
                onClose={() => setSidebarOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 lg:pl-64 min-w-0">
          {/* Mobile header */}
          <div className="sticky top-0 z-30 flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-3 lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-700"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-800">YES 청년부 출석표</h1>
          </div>

          <FirstLoginBanner />

          <main className="p-4 lg:p-6">{children}</main>
        </div>

        {/* Mobile bottom nav */}
        <MobileNav user={user} />
      </div>
    </ToastProvider>
  );
}
