import { JWTPayload } from "./auth";
import { prisma } from "./db";

export async function canAccessTeam(
  user: JWTPayload,
  teamId: string
): Promise<boolean> {
  if (user.role === "PASTOR") return true;

  if (user.role === "EXECUTIVE") {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { groupId: true },
    });
    return team?.groupId === user.groupId;
  }

  // LEADER: only own team
  return user.teamId === teamId;
}

export async function canManageTeamsInGroup(
  user: JWTPayload,
  groupId: string
): Promise<boolean> {
  if (user.role === "PASTOR") return true;
  if (user.role === "EXECUTIVE") return user.groupId === groupId;
  return false;
}

export async function canManageMembersInTeam(
  user: JWTPayload,
  teamId: string
): Promise<boolean> {
  if (user.role !== "PASTOR" && user.role !== "EXECUTIVE") return false;
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { groupId: true },
  });
  if (!team) return false;
  return canManageTeamsInGroup(user, team.groupId);
}

export function canManageRoles(user: JWTPayload): boolean {
  return user.role === "PASTOR";
}

export async function canDeleteUser(
  user: JWTPayload,
  target: { role: string; groupId: string | null }
): Promise<boolean> {
  if (user.role === "PASTOR") return true;
  if (user.role !== "EXECUTIVE") return false;
  if (target.role !== "LEADER") return false;
  if (target.groupId !== user.groupId) return false;
  return canAccessShalom(user);
}

export function canViewGroupGraph(
  user: JWTPayload,
  groupId: string
): boolean {
  if (user.role === "PASTOR") return true;
  if (user.role === "EXECUTIVE") return user.groupId === groupId;
  return false;
}

export function canViewCombinedGraph(user: JWTPayload): boolean {
  return user.role === "PASTOR";
}

export async function canAccessShalom(user: JWTPayload): Promise<boolean> {
  if (user.role === "PASTOR") return true;
  if (user.role === "EXECUTIVE" && user.groupId) {
    const group = await prisma.group.findUnique({
      where: { id: user.groupId },
      select: { name: true },
    });
    return group?.name === "샬롬";
  }
  return false;
}
