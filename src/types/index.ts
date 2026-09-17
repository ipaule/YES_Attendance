export type Role = "PASTOR" | "EXECUTIVE" | "LEADER";
export type Gender = "남" | "여";
export type AttendanceStatus = "HERE" | "ABSENT" | "AWR";

export interface User {
  id: string;
  username: string;
  role: Role;
  groupId: string | null;
  teamId: string | null;
  group?: Group | null;
  team?: Team;
}

export interface Group {
  id: string;
  name: string;
  order: number;
  teams?: Team[];
}

export interface Team {
  id: string;
  name: string;
  groupId: string;
  leaderId: string | null;
  group?: Group;
  leader?: User;
  members?: Member[];
  dates?: DateColumn[];
}

export interface Member {
  id: string;
  name: string;
  gender: Gender;
  birthYear: string;
  birthday: string;
  teamId: string;
  order: number;
  attendances?: AttendanceRecord[];
  prayerNotes?: PrayerNote[];
}

export interface DateColumn {
  id: string;
  date: string;
  label: string;
  teamId: string;
  order: number;
  locked?: boolean;
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  attendanceDateId: string;
  status: AttendanceStatus;
  awrReason: string | null;
}

export interface PrayerNote {
  id: string;
  memberId: string;
  attendanceDateId: string;
  text: string;
  updatedAt: string;
}

export interface TeamWithData extends Team {
  members: (Member & { attendances: AttendanceRecord[]; prayerNotes: PrayerNote[] })[];
  dates: DateColumn[];
  deleteBlockers?: string[];
}
