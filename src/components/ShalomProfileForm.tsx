"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Save, X, ArrowLeft } from "lucide-react";
import { ColoredDropdown } from "./ColoredDropdown";
import { PhotoBox } from "./PhotoBox";
import { chipClassFor } from "@/lib/dropdownColors";
import { computeAge, computePeerGroup, PHONE_RE, formatPhoneInput } from "@/lib/profile";
import { fetchJson } from "@/lib/http";

export interface ShalomProfileData {
  id?: string;
  name: string;
  englishName: string;
  gender: string;
  birthYear: string;
  birthday: string;
  phone: string;
  email: string;
  address: string;
  visitDate: string;
  inviter: string;
  leader: string;
  groupName: string;
  teamName: string;
  ministry: string;
  memberNumber: string;
  registrationDate: string;
  salvationAssurance: string;
  training: string;
  baptismStatus: string;
  photo: string;
  prayerRequest: string;
  note: string;
  status: string;
  movedToRosterAt?: string | null;
}

interface Props {
  initial: ShalomProfileData;
  mode: "create" | "view";
  onSave: (data: ShalomProfileData) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
  saveError?: string | null;
}

const EMPTY: ShalomProfileData = {
  name: "",
  englishName: "",
  gender: "",
  birthYear: "",
  birthday: "",
  phone: "",
  email: "",
  address: "",
  visitDate: "",
  inviter: "",
  leader: "",
  groupName: "",
  teamName: "",
  ministry: "",
  memberNumber: "",
  registrationDate: "",
  salvationAssurance: "",
  training: "",
  baptismStatus: "",
  photo: "",
  prayerRequest: "",
  note: "",
  status: "방문",
  movedToRosterAt: null,
};

export function emptyShalomProfile(): ShalomProfileData {
  return { ...EMPTY };
}

export function ShalomProfileForm({ initial, mode, onSave, onCancel, saving, saveError }: Props) {
  const router = useRouter();
  const [data, setData] = useState<ShalomProfileData>(initial);
  const [validationError, setValidationError] = useState<string | null>(null);
  const dirtyRef = useRef(false);

  useEffect(() => {
    setData(initial);
  }, [initial]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const update = <K extends keyof ShalomProfileData>(key: K, value: ShalomProfileData[K]) => {
    dirtyRef.current = true;
    setData((p) => ({ ...p, [key]: value }));
    setValidationError(null);
  };

  const handleSave = async () => {
    if (data.phone && !PHONE_RE.test(data.phone)) {
      setValidationError("전화번호 형식: XXX-XXX-XXXX");
      return;
    }
    if (mode === "create") {
      if (!data.name.trim() || !data.gender) {
        setValidationError("이름과 성별은 필수입니다.");
        return;
      }
    } else {
      if (!data.name.trim()) {
        setValidationError("이름은 필수입니다.");
        return;
      }
    }
    await onSave(data);
    dirtyRef.current = false;
  };

  const handleCancel = () => {
    if (dirtyRef.current && !confirm("변경사항이 저장되지 않았습니다. 취소하시겠습니까?")) return;
    dirtyRef.current = false;
    onCancel();
  };

  const handleBack = () => {
    if (dirtyRef.current && !confirm("변경사항이 저장되지 않았습니다. 나가시겠습니까?")) return;
    dirtyRef.current = false;
    router.back();
  };

  const peerGroup = computePeerGroup(data.birthday, data.birthYear);
  const age = computeAge(data.birthday, data.birthYear);

  const { data: groupTeams = [] } = useQuery({
    queryKey: ["teams-by-group-name", data.groupName],
    queryFn: async (): Promise<{ id: string; name: string }[]> => {
      const json = await fetchJson<{ teams: { id: string; name: string }[] }>(
        `/api/teams?groupName=${encodeURIComponent(data.groupName)}`
      );
      return json.teams.map((t) => ({ id: t.id, name: t.name }));
    },
    enabled: !!data.groupName,
    staleTime: 30_000,
  });

  const moved = !!data.movedToRosterAt;
  const movedLabel = moved && data.movedToRosterAt
    ? new Date(data.movedToRosterAt).toISOString().slice(0, 10)
    : "";

  const statusChipClass = (s: string) => {
    if (s === "방문") return chipClassFor("blue");
    if (s === "등록") return chipClassFor("green");
    if (s === "졸업") return chipClassFor("purple");
    return chipClassFor(null);
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-4 max-w-4xl">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {mode === "create" ? "샬롬 신규 등록" : data.name || "샬롬 인원"}
          </h1>
          {moved && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs border bg-gray-100 text-gray-500 border-gray-200">
              이동됨 ({movedLabel})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "저장 중..." : "저장"}
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-4 py-2 disabled:opacity-50"
          >
            <X className="h-4 w-4" /> 취소
          </button>
        </div>
      </div>

      {(validationError || saveError) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {validationError || saveError}
        </div>
      )}

      {/* Header card: photo + name + identity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex gap-5">
        <PhotoBox
          url={data.photo}
          memberId={data.id}
          onUploaded={(url) => update("photo", url)}
          onCleared={() => update("photo", "")}
        />
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="이름 (한글)">
            <input
              type="text"
              value={data.name}
              onChange={(e) => update("name", e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            />
          </Field>
          <Field label="이름 (영문)">
            <input
              type="text"
              value={data.englishName}
              onChange={(e) => update("englishName", e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            />
          </Field>
          <Field label="성별">
            <ColoredDropdown
              category="gender"
              value={data.gender}
              onChange={(v) => update("gender", v)}
              allowAdd
              allowManage
              placeholder="선택"
            />
          </Field>
          <Field label="생년월일">
            <input
              type="date"
              value={data.birthday}
              onChange={(e) => update("birthday", e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            />
          </Field>
          <Field label="또래 (숫자)">
            <input
              type="text"
              value={data.birthYear}
              onChange={(e) => update("birthYear", e.target.value)}
              placeholder="97"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            />
          </Field>
          <div className="col-span-full text-xs text-gray-400">
            또래 {peerGroup === "—" ? "—" : `${peerGroup}년생`} · 나이 {age == null ? "—" : `${age}세`}
          </div>
        </div>
      </div>

      {/* 방문 정보 */}
      <Section title="방문 정보">
        <Field label="방문 날짜">
          <input
            type="date"
            value={data.visitDate}
            onChange={(e) => update("visitDate", e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300"
          />
        </Field>
        <Field label="인도자">
          <input
            type="text"
            value={data.inviter}
            onChange={(e) => update("inviter", e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300"
          />
        </Field>
        <Field label="순장 (메모)">
          <input
            type="text"
            value={data.leader}
            onChange={(e) => update("leader", e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300"
          />
        </Field>
      </Section>

      {/* 연락처 */}
      <Section title="연락처">
        <Field label="전화번호">
          <input
            type="text"
            value={data.phone}
            onChange={(e) => update("phone", formatPhoneInput(e.target.value))}
            placeholder="XXX-XXX-XXXX"
            className={`w-full text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300 ${
              data.phone && !PHONE_RE.test(data.phone) ? "border-red-300" : "border-gray-300"
            }`}
          />
        </Field>
        <Field label="이메일">
          <input
            type="email"
            value={data.email}
            onChange={(e) => update("email", e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300"
          />
        </Field>
        <Field label="주소">
          <textarea
            value={data.address}
            onChange={(e) => update("address", e.target.value)}
            rows={2}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300"
          />
        </Field>
      </Section>

      {/* 소속 */}
      <Section title="소속">
        <Field label="공동체">
          <ColoredDropdown
            category="community"
            value={data.groupName}
            onChange={(v) => {
              update("groupName", v);
              update("teamName", "");
            }}
            allowAdd
            allowManage
          />
        </Field>
        <Field label="순장">
          <select
            value={data.teamName}
            onChange={(e) => update("teamName", e.target.value)}
            disabled={!data.groupName}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="">{data.groupName ? "" : "공동체를 먼저 선택하세요"}</option>
            {groupTeams.map((t) => (
              <option key={t.id} value={t.name}>{t.name}</option>
            ))}
            {data.teamName && !groupTeams.some((t) => t.name === data.teamName) && (
              <option value={data.teamName}>{data.teamName}</option>
            )}
          </select>
        </Field>
        <Field label="사역">
          <input
            type="text"
            value={data.ministry}
            onChange={(e) => update("ministry", e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300"
          />
        </Field>
        <Field label="교인번호">
          <input
            type="text"
            value={data.memberNumber}
            onChange={(e) => update("memberNumber", e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300"
          />
        </Field>
        <Field label="등록 날짜">
          <input
            type="date"
            value={data.registrationDate}
            onChange={(e) => update("registrationDate", e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300"
          />
        </Field>
      </Section>

      {/* 신앙 */}
      <Section title="신앙">
        <Field label="구원확신">
          <ColoredDropdown
            category="salvation_assurance"
            value={data.salvationAssurance}
            onChange={(v) => update("salvationAssurance", v)}
            allowAdd
            allowManage
          />
        </Field>
        <Field label="훈련과정">
          <ColoredDropdown
            category="training"
            value={data.training}
            onChange={(v) => update("training", v)}
            allowAdd
            allowManage
          />
        </Field>
        <Field label="세례 여부">
          <ColoredDropdown
            category="baptism_status"
            value={data.baptismStatus}
            onChange={(v) => update("baptismStatus", v)}
            allowAdd
            allowManage
          />
        </Field>
      </Section>

      {/* 상태 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">상태</h3>
        <select
          value={data.status}
          onChange={(e) => update("status", e.target.value)}
          className={`text-xs font-medium px-2 py-1 rounded-full border cursor-pointer ${statusChipClass(data.status)}`}
        >
          <option value="방문">방문</option>
          <option value="등록">등록</option>
          <option value="졸업">졸업</option>
        </select>
      </div>

      {/* 기도제목 + 비고 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
        <Field label="기도제목">
          <textarea
            value={data.prayerRequest}
            onChange={(e) => update("prayerRequest", e.target.value)}
            rows={3}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-300"
          />
        </Field>
        <Field label="비고">
          <textarea
            value={data.note}
            onChange={(e) => update("note", e.target.value)}
            rows={3}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-300"
          />
        </Field>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
