import { prisma } from "@/lib/db";

/**
 * Finds reasons a user cannot be deleted: they lead a 순 (Team.leaderId), a 순
 * is named after them (Team.name snapshot that can drift from leaderId — see
 * plan for why this must be checked independently), or they're named as
 * leader in the 샬롬 리스트 (ShalomMember.leader, free text).
 *
 * Two queries regardless of how many users are passed — no N+1.
 */
export async function findDeleteBlockers(
  users: { id: string; username: string }[]
): Promise<Map<string, string[]>> {
  const reasons = new Map<string, string[]>();
  if (users.length === 0) return reasons;

  const ids = users.map((u) => u.id);
  const usernames = users.map((u) => u.username);
  const usernameToId = new Map(users.map((u) => [u.username, u.id]));

  const [teams, shalomLeaders] = await Promise.all([
    prisma.team.findMany({
      where: { OR: [{ leaderId: { in: ids } }, { name: { in: usernames } }] },
      select: { name: true, leaderId: true, group: { select: { name: true } } },
    }),
    prisma.shalomMember.groupBy({
      by: ["leader"],
      where: { leader: { in: usernames } },
      _count: true,
    }),
  ]);

  const add = (userId: string, reason: string) => {
    const list = reasons.get(userId);
    if (list) list.push(reason);
    else reasons.set(userId, [reason]);
  };

  for (const team of teams) {
    if (team.leaderId) {
      add(team.leaderId, `${team.group.name} 공동체의 '${team.name}' 순을 맡고 있습니다.`);
    } else {
      const userId = usernameToId.get(team.name);
      if (userId) {
        add(userId, `${team.group.name} 공동체에 '${team.name}' 순이 남아 있습니다.`);
      }
    }
  }

  for (const { leader, _count } of shalomLeaders) {
    const userId = usernameToId.get(leader);
    if (userId) {
      add(userId, `샬롬 리스트에서 ${_count}명의 순장으로 지정되어 있습니다.`);
    }
  }

  return reasons;
}
