export type Role = "PASTOR" | "EXECUTIVE" | "LEADER";
export type Gender = "MALE" | "FEMALE";
export type AttendanceStatus = "HERE" | "ABSENT" | "AWR";

export interface User {
  id: string;
  username: string;
  role: Role;
  groupId: string;
  teamId: string | null;
  group?: Group;
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
  birthYear: number;
  teamId: string;
  order: number;
  attendances?: AttendanceRecord[];
}

export interface DateColumn {
  id: string;
  date: string;
  label: string;
  teamId: string;
  order: number;
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  attendanceDateId: string;
  status: AttendanceStatus;
  awrReason: string | null;
}

export interface TeamWithData extends Team {
  members: (Member & { attendances: AttendanceRecord[] })[];
  dates: DateColumn[];
}
