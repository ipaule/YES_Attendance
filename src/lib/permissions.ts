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

export function canManageRoles(user: JWTPayload): boolean {
  return user.role === "PASTOR";
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
