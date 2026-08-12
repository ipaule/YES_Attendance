"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { HELP_SECTIONS, FAQ } from "@/content/help";
import type { Role } from "@/types";

export default function HelpPage() {
  const { user } = useAuth();
  const [showAll, setShowAll] = useState(false);
  const role = user?.role as Role | undefined;

  const visibleSections = useMemo(
    () => HELP_SECTIONS.filter((s) => showAll || !role || s.roles.includes(role)),
    [showAll, role]
  );
  const visibleFaq = useMemo(
    () => FAQ.filter((f) => showAll || !role || f.roles.includes(role)),
    [showAll, role]
  );

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">사용 안내</h1>
        </div>
        <button
          onClick={() => setShowAll((v) => !v)}
          className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5 flex-shrink-0"
        >
          {showAll ? "내 역할만 보기" : "전체 보기"}
        </button>
      </div>

      <nav className="flex flex-wrap gap-1 bg-white rounded-xl shadow-sm border border-gray-200 p-3 text-xs">
        {visibleSections.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="text-indigo-600 hover:underline px-2 py-1 rounded hover:bg-indigo-50">
            {s.title}
          </a>
        ))}
        <a href="#faq" className="text-indigo-600 hover:underline px-2 py-1 rounded hover:bg-indigo-50">
          자주 묻는 질문
        </a>
      </nav>

      {visibleSections.map((s) => (
        <section
          key={s.id}
          id={s.id}
          className="scroll-mt-20 bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-2"
        >
          <h2 className="font-semibold text-gray-800">{s.title}</h2>
          {s.paragraphs.map((p, i) => (
            <p key={i} className="text-sm text-gray-600 leading-relaxed">
              {p}
            </p>
          ))}
        </section>
      ))}

      <section id="faq" className="scroll-mt-20 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-800 mb-2">자주 묻는 질문</h2>
        <div className="divide-y divide-gray-100">
          {visibleFaq.map((f) => (
            <details key={f.id} className="py-2">
              <summary className="cursor-pointer text-sm font-medium text-gray-800">{f.question}</summary>
              <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{f.answer}</p>
            </details>
          ))}
          {visibleFaq.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center">해당하는 항목이 없습니다.</p>
          )}
        </div>
      </section>
    </div>
  );
}
