"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Trash2, ArrowUpDown } from "lucide-react";
import { ColoredDropdown } from "@/components/ColoredDropdown";

interface UnregisteredMember {
  id: string;
  name: string;
  englishName: string;
  gender: string;
  birthYear: string;
  birthday: string;
  groupName: string;
  phone: string;
  training: string;
  baptismStatus: string;
  recentAttendance: string;
  recentAttendanceOverride: string;
  contactStatus: string;
  personStatus: string;
  statusReason: string;
  assignee: string;
}

const TERM_RANK: Record<string, number> = {
  "현재 텀": 99999,
  미확인: -1,
};

function termRank(value: string): number {
  if (value in TERM_RANK) return TERM_RANK[value];
  // Best-effort: parse "YY봄/가을" so 26봄 > 25가을 > 25봄
  const m = value.match(/^(\d{2})(봄|가을|졸업)?/);
  if (m) {
    const yr = parseInt(m[1], 10);
    const seasonRank = m[2] === "가을" ? 1 : 0;
    return yr * 10 + seasonRank;
  }
  return 0;
}

export default function UnregisteredPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterContact, setFilterContact] = useState("");

  type SortKey =
    | "name"
    | "englishName"
    | "gender"
    | "birthday"
    | "groupName"
    | "phone"
    | "recentAttendance"
    | "contactStatus"
    | "personStatus"
    | "statusReason"
    | "assignee";
  type SortDir = "none" | "asc" | "desc";
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("none");

  const { data: members = [], isLoading, error } = useQuery({
    queryKey: ["unregistered"],
    queryFn: async (): Promise<UnregisteredMember[]> => {
      const res = await fetch("/api/unregistered");
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).members;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<UnregisteredMember> }) => {
      const res = await fetch(`/api/roster/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["unregistered"] });
      queryClient.invalidateQueries({ queryKey: ["roster"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/roster/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["unregistered"] });
      queryClient.invalidateQueries({ queryKey: ["roster"] });
    },
  });

  const filtered = useMemo(() => {
    let list = members;
    if (search) list = list.filter((m) => m.name.includes(search) || m.englishName.toLowerCase().includes(search.toLowerCase()));
    if (filterGroup) list = list.filter((m) => m.groupName === filterGroup);
    if (filterStatus) list = list.filter((m) => m.personStatus === filterStatus);
    if (filterAssignee) list = list.filter((m) => m.assignee === filterAssignee);
    if (filterContact) list = list.filter((m) => m.contactStatus === filterContact);

    const active: { key: SortKey; dir: SortDir } =
      sortKey && sortDir !== "none"
        ? { key: sortKey, dir: sortDir }
        : { key: "recentAttendance", dir: "desc" };

    const toValue = (m: UnregisteredMember, key: SortKey) => {
      if (key === "recentAttendance") return termRank(m.recentAttendanceOverride || m.recentAttendance);
      if (key === "birthday") {
        // Compare as YYYY-MM-DD lexicographically; missing sorts last
        return m.birthday || "9999-99-99";
      }
      return (m[key] || "") as string;
    };

    return [...list].sort((a, b) => {
      const va = toValue(a, active.key);
      const vb = toValue(b, active.key);
      let cmp = 0;
      if (typeof va === "number" && typeof vb === "number") {
        cmp = va - vb;
      } else {
        cmp = String(va).localeCompare(String(vb), "ko");
      }
      return active.dir === "asc" ? cmp : -cmp;
    });
  }, [members, search, filterGroup, filterStatus, filterAssignee, filterContact, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("desc");
    } else {
      setSortDir((p) => (p === "desc" ? "asc" : p === "asc" ? "none" : "desc"));
    }
  };

  const sortIcon = (key: SortKey) => (
    <ArrowUpDown
      className={`h-3 w-3 inline-block ml-0.5 ${
        sortKey === key && sortDir !== "none" ? "text-indigo-600" : "text-gray-400"
      }`}
    />
  );

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">미등록자 관리</h1>
        {isLoading && <span className="text-sm text-gray-400">로딩 중...</span>}
        {error && <span className="text-sm text-red-400">오류</span>}
        {!isLoading && <span className="text-sm text-gray-400">{filtered.length}명</span>}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-[150px]">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="이름 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-sm border-0 focus:outline-none flex-1"
          />
        </div>
        <FilterDropdown category="community" value={filterGroup} onChange={setFilterGroup} placeholder="공동체" />
        <FilterDropdown category="contact_status" value={filterContact} onChange={setFilterContact} placeholder="연락 여부" />
        <FilterDropdown category="person_status" value={filterStatus} onChange={setFilterStatus} placeholder="상태분류" />
        <FilterDropdown category="assignee" value={filterAssignee} onChange={setFilterAssignee} placeholder="담당자" />
        {(search || filterGroup || filterStatus || filterAssignee || filterContact) && (
          <button
            onClick={() => {
              setSearch("");
              setFilterGroup("");
              setFilterStatus("");
              setFilterAssignee("");
              setFilterContact("");
            }}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            초기화
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <Th>#</Th>
                <SortTh label="이름" k="name" onClick={toggleSort} icon={sortIcon} />
                <SortTh label="영문" k="englishName" onClick={toggleSort} icon={sortIcon} />
                <SortTh label="성별" k="gender" onClick={toggleSort} icon={sortIcon} />
                <SortTh label="생년월일" k="birthday" onClick={toggleSort} icon={sortIcon} />
                <SortTh label="공동체" k="groupName" onClick={toggleSort} icon={sortIcon} />
                <SortTh label="전화번호" k="phone" onClick={toggleSort} icon={sortIcon} />
                <SortTh label="최근 출석" k="recentAttendance" onClick={toggleSort} icon={sortIcon} />
                <SortTh label="연락 여부" k="contactStatus" onClick={toggleSort} icon={sortIcon} />
                <SortTh label="상태분류" k="personStatus" onClick={toggleSort} icon={sortIcon} />
                <SortTh label="사유" k="statusReason" onClick={toggleSort} icon={sortIcon} />
                <SortTh label="담당자" k="assignee" onClick={toggleSort} icon={sortIcon} />
                <Th>{""}</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, idx) => (
                <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-2 py-1 text-center text-xs text-gray-400">{idx + 1}</td>
                  <td className="px-2 py-1">
                    <button
                      onClick={() => router.push(`/dashboard/roster/${m.id}`)}
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      {m.name || "—"}
                    </button>
                  </td>
                  <td className="px-2 py-1 text-xs text-gray-600">{m.englishName || "—"}</td>
                  <td className="px-2 py-1 text-center">
                    <span className={`text-xs font-medium ${m.gender === "남" ? "text-blue-600" : m.gender === "여" ? "text-red-600" : "text-gray-400"}`}>
                      {m.gender || "—"}
                    </span>
                  </td>
                  <td className="px-2 py-1 text-xs text-gray-600">{m.birthday || "—"}</td>
                  <td className="px-2 py-1">
                    <ColoredDropdown
                      category="community"
                      value={m.groupName}
                      onChange={(v) => updateMutation.mutate({ id: m.id, data: { groupName: v } })}
                    />
                  </td>
                  <td className="px-2 py-1 text-xs text-gray-600">{m.phone || "—"}</td>
                  <td className="px-2 py-1">
                    <ColoredDropdown
                      category="recent_attendance"
                      value={m.recentAttendanceOverride || m.recentAttendance}
                      onChange={(v) =>
                        updateMutation.mutate({
                          id: m.id,
                          data: { recentAttendanceOverride: v },
                        })
                      }
                      placeholder={m.recentAttendance}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <ColoredDropdown
                      category="contact_status"
                      value={m.contactStatus}
                      onChange={(v) => updateMutation.mutate({ id: m.id, data: { contactStatus: v } })}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <ColoredDropdown
                      category="person_status"
                      value={m.personStatus}
                      onChange={(v) => updateMutation.mutate({ id: m.id, data: { personStatus: v } })}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      defaultValue={m.statusReason}
                      onBlur={(e) => {
                        if (e.target.value !== m.statusReason) {
                          updateMutation.mutate({ id: m.id, data: { statusReason: e.target.value } });
                        }
                      }}
                      className="w-full text-xs border border-transparent hover:border-gray-200 focus:border-indigo-300 rounded px-1 py-0.5 focus:outline-none"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <ColoredDropdown
                      category="assignee"
                      value={m.assignee}
                      onChange={(v) => updateMutation.mutate({ id: m.id, data: { assignee: v } })}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <button
                      onClick={() => {
                        if (confirm(`${m.name}님을 삭제하시겠습니까?`)) {
                          deleteMutation.mutate(m.id);
                        }
                      }}
                      className="text-gray-300 hover:text-red-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && !isLoading && (
            <div className="text-center py-12 text-gray-400">
              <p>미등록자가 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SortTh<K extends string>({
  label,
  k,
  onClick,
  icon,
}: {
  label: string;
  k: K;
  onClick: (k: K) => void;
  icon: (k: K) => React.ReactNode;
}) {
  return (
    <th
      className="px-2 py-2 text-xs font-medium text-gray-600 text-center whitespace-nowrap cursor-pointer select-none hover:text-indigo-600"
      onClick={() => onClick(k)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        {icon(k)}
      </span>
    </th>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-2 py-2 text-xs font-medium text-gray-600 text-center whitespace-nowrap">{children}</th>
  );
}

function FilterDropdown({
  category,
  value,
  onChange,
  placeholder,
}: {
  category: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const { data: options = [] } = useQuery({
    queryKey: ["dropdown-options", category],
    queryFn: async () => {
      const res = await fetch(`/api/dropdown-options?category=${category}`);
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).options as { id: string; value: string }[];
    },
    staleTime: 30_000,
  });

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-xs border border-gray-300 rounded-lg px-2 py-1.5"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.id} value={o.value}>
          {o.value}
        </option>
      ))}
    </select>
  );
}
