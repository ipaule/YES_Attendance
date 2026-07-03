"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Save, X, ArrowLeft } from "lucide-react";
import { ColoredDropdown } from "./ColoredDropdown";
import { PhotoBox } from "./PhotoBox";
import { computeAge, computePeerGroup, validateProfilePatch, PHONE_RE, formatPhoneInput } from "@/lib/profile";
import { fetchJson } from "@/lib/http";

export interface RosterProfileData {
  id?: string;
  name: string;
  englishName: string;
  gender: string;
  birthYear: string;
  birthday: string;
  groupName: string;
  teamName: string;
  ministry: string;
  note: string;
  email: string;
  phone: string;
  address: string;
  salvationAssurance: string;
  training: string;
  memberNumber: string;
  registrationDate: string;
  prayerRequest: string;
  photo: string;
  baptismStatus: string;
}

interface Props {
  initial: RosterProfileData;
  mode: "create" | "view";
  onSave: (data: RosterProfileData) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
  saveError?: string | null;
}

const EMPTY: RosterProfileData = {
  name: "",
  englishName: "",
  gender: "",
  birthYear: "",
  birthday: "",
  groupName: "",
  teamName: "",
  ministry: "",
  note: "",
  email: "",
  phone: "",
  address: "",
  salvationAssurance: "",
  training: "",
  memberNumber: "",
  registrationDate: "",
  prayerRequest: "",
  photo: "",
  baptismStatus: "",
};

export function emptyProfile(): RosterProfileData {
  return { ...EMPTY };
}

export function RosterProfileForm({ initial, mode, onSave, onCancel, saving, saveError }: Props) {
  const router = useRouter();
  const [data, setData] = useState<RosterProfileData>(initial);
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

  const update = <K extends keyof RosterProfileData>(key: K, value: RosterProfileData[K]) => {
    dirtyRef.current = true;
    setData((p) => ({ ...p, [key]: value }));
    setValidationError(null);
  };

  const handleSave = async () => {
    const err = validateProfilePatch({
      name: data.name,
      email: data.email,
      phone: data.phone,
      birthday: data.birthday,
    });
    if (err) {
      setValidationError(err);
      return;
    }
    if (mode === "create") {
      if (!data.name.trim() || !data.gender || !data.groupName) {
        setValidationError("이름, 성별, 공동체는 필수입니다.");
        return;
      }
    }
    await onSave(data);
    dirtyRef.current = false;
  };

  const handleCancel = () => {
    if (dirtyRef.current && !confirm("변경사항이 저장되지 않았습니다. 취소하시겠습니까?")) {
      return;
    }
    dirtyRef.current = false;
    onCancel();
  };

  const handleBack = () => {
    if (dirtyRef.current && !confirm("변경사항이 저장되지 않았습니다. 나가시겠습니까?")) {
      return;
    }
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

  return (
    <div className="space-y-4 pb-20 lg:pb-4 max-w-4xl">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {mode === "create" ? "새 인원 추가" : data.name || "인원 정보"}
          </h1>
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
            <X className="h-4 w-4" />
            취소
          </button>
        </div>
      </div>

      {(validationError || saveError) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {validationError || saveError}
        </div>
      )}

      {/* Header card: photo + name + gender + birthday */}
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
          <div className="col-span-full text-xs text-gray-400">
            또래 {peerGroup === "—" ? "—" : `${peerGroup}년생`} · 나이 {age == null ? "—" : `${age}세`}
          </div>
        </div>
      </div>

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
            onChange={(v) => update("groupName", v)}
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

      {/* Full-width */}
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

