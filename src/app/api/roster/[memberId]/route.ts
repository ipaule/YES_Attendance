import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { validateProfilePatch } from "@/lib/profile";
import { buildRecentAttendanceMap } from "@/lib/recentAttendance";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "PASTOR") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { memberId } = await params;
  const member = await prisma.rosterMember.findUnique({ where: { id: memberId } });
  if (!member) {
    return NextResponse.json({ error: "해당 인원을 찾을 수 없습니다." }, { status: 404 });
  }

  const map = await buildRecentAttendanceMap();
  const recentAttendance =
    member.recentAttendanceOverride || map[member.name] || "미확인";

  return NextResponse.json({ member: { ...member, recentAttendance } });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "PASTOR") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { memberId } = await params;
  const data = await request.json();

  const validationError = validateProfilePatch(data);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const oldMember = await prisma.rosterMember.findUnique({ where: { id: memberId } });
  if (!oldMember) {
    return NextResponse.json({ error: "해당 인원을 찾을 수 없습니다." }, { status: 404 });
  }

  // Whitelist editable fields; drop server-owned fields (id, createdAt, order,
  // recentAttendance computed field) silently.
  const patch: Record<string, unknown> = {};
  for (const key of [
    "name",
    "englishName",
    "gender",
    "birthYear",
    "birthday",
    "groupName",
    "teamName",
    "ministry",
    "note",
    "email",
    "phone",
    "address",
    "salvationAssurance",
    "training",
    "memberNumber",
    "registrationDate",
    "prayerRequest",
    "peerGroup",
    "recentAttendanceOverride",
    "contactStatus",
    "personStatus",
    "statusReason",
    "assignee",
    "photo",
    "baptismStatus",
  ] as const) {
    if (key in data) patch[key] = data[key];
  }

  // If teamName transitions from "" to non-empty, wipe 미등록자-only fields.
  const wasUnassigned = !oldMember.teamName;
  const becomingAssigned =
    data.teamName !== undefined && data.teamName !== "" && wasUnassigned;

  if (becomingAssigned) {
    patch.recentAttendanceOverride = "";
    patch.contactStatus = "";
    patch.personStatus = "";
    patch.statusReason = "";
    patch.assignee = "";
  }

  // Shift everyone else down, then move this member to the top.
  await prisma.$executeRawUnsafe(
    `UPDATE RosterMember SET "order" = "order" + 1 WHERE id != $1`,
    memberId
  );
  patch.order = 0;

  const member = await prisma.rosterMember.update({
    where: { id: memberId },
    data: patch,
  });

  // Sync name/gender/birthYear changes to team Member records (existing behavior).
  const updates: Record<string, string> = {};
  if (data.name !== undefined && data.name !== oldMember.name) updates.name = data.name;
  if (data.gender !== undefined && data.gender !== oldMember.gender) updates.gender = data.gender;
  if (data.birthYear !== undefined && data.birthYear !== oldMember.birthYear) updates.birthYear = data.birthYear;

  if (Object.keys(updates).length > 0) {
    await prisma.member.updateMany({
      where: { name: oldMember.name },
      data: updates,
    });
  }

  // Team-assignment sync: when the roster's teamName/groupName changes,
  // mirror the move into the attendance Member table so the person appears
  // in/leaves the team's attendance view automatically.
  const oldGroupName = oldMember.groupName;
  const oldTeamName = oldMember.teamName;
  const newGroupName = data.groupName !== undefined ? data.groupName : oldGroupName;
  const newTeamName = data.teamName !== undefined ? data.teamName : oldTeamName;
  const assignmentChanged = newGroupName !== oldGroupName || newTeamName !== oldTeamName;

  if (assignmentChanged) {
    // 1. Remove from old team (if any). Member.name can change above; use new name.
    if (oldTeamName && oldGroupName) {
      const oldGroup = await prisma.group.findFirst({
        where: { name: oldGroupName },
        select: { id: true },
      });
      if (oldGroup) {
        const oldTeam = await prisma.team.findFirst({
          where: { name: oldTeamName, groupId: oldGroup.id },
          select: { id: true },
        });
        if (oldTeam) {
          await prisma.member.deleteMany({
            where: { name: member.name, teamId: oldTeam.id },
          });
        }
      }
    }
    // 2. Add to new team (if any) — only if a matching Team row exists and the
    // person isn't already on it.
    if (newTeamName && newGroupName) {
      const newGroup = await prisma.group.findFirst({
        where: { name: newGroupName },
        select: { id: true },
      });
      if (newGroup) {
        const newTeam = await prisma.team.findFirst({
          where: { name: newTeamName, groupId: newGroup.id },
          select: { id: true },
        });
        if (newTeam) {
          const already = await prisma.member.findFirst({
            where: { name: member.name, teamId: newTeam.id },
            select: { id: true },
          });
          if (!already) {
            const maxOrder = await prisma.member.findFirst({
              where: { teamId: newTeam.id },
              orderBy: { order: "desc" },
              select: { order: true },
            });
            await prisma.member.create({
              data: {
                name: member.name,
                gender: member.gender,
                birthYear: member.birthYear,
                teamId: newTeam.id,
                order: (maxOrder?.order ?? -1) + 1,
              },
            });
          }
        }
      }
    }
  }

  return NextResponse.json({ member });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "PASTOR") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { memberId } = await params;

  const roster = await prisma.rosterMember.findUnique({ where: { id: memberId } });
  if (!roster) {
    return NextResponse.json({ error: "해당 인원을 찾을 수 없습니다." }, { status: 404 });
  }

  // Delete all attendance Member records for this person before removing the roster entry
  await prisma.member.deleteMany({ where: { name: roster.name } });

  await prisma.rosterMember.delete({ where: { id: memberId } });

  return NextResponse.json({ success: true });
}
