import { prisma } from "@/lib/db";
import { validateProfilePatch } from "@/lib/profile";
import { normalizeRosterName } from "@/lib/roster-names";

export class RosterMutationError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const ALLOWED_FIELDS = [
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
] as const;

/**
 * Applies a whitelisted patch to one RosterMember, mirrors name/gender/
 * birthYear changes into attendance Member rows, and syncs a team-assignment
 * move (groupName/teamName change) into the attendance Member table.
 *
 * `bumpToTop` controls the drag-order side effect: the single-row PATCH route
 * bumps the edited row to order 0 and shifts everyone else down; a bulk edit
 * must skip that or 10 sequential calls would scramble the manual drag order
 * into reverse-selection order.
 */
export async function applyRosterPatch(
  memberId: string,
  data: Record<string, unknown>,
  opts: { bumpToTop: boolean }
) {
  const validationError = validateProfilePatch(data);
  if (validationError) throw new RosterMutationError(validationError, 400);

  const oldMember = await prisma.rosterMember.findUnique({ where: { id: memberId } });
  if (!oldMember) throw new RosterMutationError("해당 인원을 찾을 수 없습니다.", 404);

  const patch: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
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

  if (opts.bumpToTop) {
    // Shift everyone else down, then move this member to the top.
    await prisma.$executeRawUnsafe(
      `UPDATE RosterMember SET "order" = "order" + 1 WHERE id != $1`,
      memberId
    );
    patch.order = 0;
  }

  const member = await prisma.rosterMember.update({
    where: { id: memberId },
    data: patch,
  });

  // Sync name/gender/birthYear changes to team Member records (existing behavior).
  // Scoped to this roster person's own team — an unscoped update-by-name would
  // also rewrite an unrelated homonym's Member row on a different team.
  const updates: Record<string, string> = {};
  if (data.name !== undefined && data.name !== oldMember.name) updates.name = data.name as string;
  if (data.gender !== undefined && data.gender !== oldMember.gender) updates.gender = data.gender as string;
  if (data.birthYear !== undefined && data.birthYear !== oldMember.birthYear) updates.birthYear = data.birthYear as string;

  if (Object.keys(updates).length > 0 && oldMember.groupName && oldMember.teamName) {
    const ownGroup = await prisma.group.findFirst({
      where: { name: oldMember.groupName },
      select: { id: true },
    });
    const ownTeam = ownGroup
      ? await prisma.team.findFirst({
          where: { name: oldMember.teamName, groupId: ownGroup.id },
          select: { id: true },
        })
      : null;
    if (ownTeam) {
      const exactUpdate = await prisma.member.updateMany({
        where: { name: oldMember.name, teamId: ownTeam.id },
        data: updates,
      });
      if (exactUpdate.count === 0) {
        const stripped = normalizeRosterName(oldMember.name);
        if (stripped !== oldMember.name) {
          await prisma.member.updateMany({
            where: { name: stripped, teamId: ownTeam.id },
            data: updates,
          });
        }
      }
    }
  }

  // Team-assignment sync: when the roster's teamName/groupName changes,
  // mirror the move into the attendance Member table so the person appears
  // in/leaves the team's attendance view automatically.
  const oldGroupName = oldMember.groupName;
  const oldTeamName = oldMember.teamName;
  const newGroupName = data.groupName !== undefined ? (data.groupName as string) : oldGroupName;
  const newTeamName = data.teamName !== undefined ? (data.teamName as string) : oldTeamName;
  const assignmentChanged = newGroupName !== oldGroupName || newTeamName !== oldTeamName;
  // Set when "add to new team" below can't find a matching Team row — the
  // roster field still saves, but the person won't show up on the team's
  // attendance table until a Team row for this name/group exists. Surfaced
  // to the client so this doesn't fail silently (C9).
  let syncWarning: string | undefined;

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
          const exactDel = await prisma.member.deleteMany({
            where: { name: member.name, teamId: oldTeam.id },
          });
          if (exactDel.count === 0) {
            const stripped = normalizeRosterName(member.name);
            if (stripped !== member.name) {
              await prisma.member.deleteMany({ where: { name: stripped, teamId: oldTeam.id } });
            }
          }
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
      if (!newGroup) {
        syncWarning = `"${newGroupName}" 공동체를 찾을 수 없어 출석표에는 반영되지 않았습니다.`;
      }
      if (newGroup) {
        const newTeam = await prisma.team.findFirst({
          where: { name: newTeamName, groupId: newGroup.id },
          select: { id: true },
        });
        if (!newTeam) {
          syncWarning = `"${newTeamName}" 순을 찾을 수 없어 출석표에는 반영되지 않았습니다.`;
        }
        if (newTeam) {
          const already = await prisma.member.findFirst({
            where: { name: member.name, teamId: newTeam.id },
            select: { id: true },
          });
          if (!already) {
            const stripped = normalizeRosterName(member.name);
            let nameToStore = stripped;
            if (stripped !== member.name) {
              const collision = await prisma.member.findFirst({
                where: { teamId: newTeam.id, name: stripped },
                select: { id: true },
              });
              if (collision) nameToStore = member.name;
            }
            const maxOrder = await prisma.member.findFirst({
              where: { teamId: newTeam.id },
              orderBy: { order: "desc" },
              select: { order: true },
            });
            await prisma.member.create({
              data: {
                name: nameToStore,
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

  return { member, warning: syncWarning };
}

export async function deleteRosterMember(memberId: string) {
  const roster = await prisma.rosterMember.findUnique({ where: { id: memberId } });
  if (!roster) throw new RosterMutationError("해당 인원을 찾을 수 없습니다.", 404);

  // Delete the attendance Member record for this specific person's own team
  // before removing the roster entry. Scoped by team — an unscoped
  // delete-by-name would also remove an unrelated homonym's Member row on a
  // different team (this bit real data before; see plan/CLAUDE.md).
  if (roster.groupName && roster.teamName) {
    const group = await prisma.group.findFirst({
      where: { name: roster.groupName },
      select: { id: true },
    });
    const team = group
      ? await prisma.team.findFirst({
          where: { name: roster.teamName, groupId: group.id },
          select: { id: true },
        })
      : null;
    if (team) {
      const exactDel = await prisma.member.deleteMany({
        where: { name: roster.name, teamId: team.id },
      });
      if (exactDel.count === 0) {
        const stripped = normalizeRosterName(roster.name);
        if (stripped !== roster.name) {
          await prisma.member.deleteMany({ where: { name: stripped, teamId: team.id } });
        }
      }
    }
  }

  await prisma.rosterMember.delete({ where: { id: memberId } });
}
