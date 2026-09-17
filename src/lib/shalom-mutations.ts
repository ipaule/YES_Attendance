import { prisma } from "@/lib/db";

export class ShalomMutationError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Moves one graduated (졸업) ShalomMember into RosterMember: creates the
 * roster row (bumping it to the top of the manual order, same as a fresh
 * roster add), stamps movedToRosterAt, and folds visit context into the note.
 */
export async function moveShalomMemberToRoster(memberId: string) {
  const shalom = await prisma.shalomMember.findUnique({ where: { id: memberId } });
  if (!shalom) throw new ShalomMutationError("대상을 찾을 수 없습니다.", 404);
  if (shalom.status !== "졸업") throw new ShalomMutationError("졸업 상태에서만 이동할 수 있습니다.", 400);
  if (shalom.movedToRosterAt) throw new ShalomMutationError("이미 로스터로 이동되었습니다.", 409);

  const rosterExisting = await prisma.rosterMember.findFirst({ where: { name: shalom.name } });
  if (rosterExisting) throw new ShalomMutationError("이미 같은 이름이 로스터에 존재합니다.", 409);

  // Synthesize note with visit context (순장 now transfers as a structured field).
  const header = `[샬롬 졸업${shalom.visitDate ? ` · 방문일: ${shalom.visitDate}` : ""}${shalom.inviter ? ` · 인도자: ${shalom.inviter}` : ""}]`;
  const noteCombined = shalom.note ? `${header}\n${shalom.note}` : header;

  await prisma.$executeRawUnsafe('UPDATE RosterMember SET "order" = "order" + 1');

  const [, roster] = await prisma.$transaction([
    prisma.shalomMember.update({
      where: { id: memberId },
      data: { movedToRosterAt: new Date() },
    }),
    prisma.rosterMember.create({
      data: {
        name: shalom.name,
        englishName: shalom.englishName,
        gender: shalom.gender,
        birthYear: shalom.birthYear,
        birthday: shalom.birthday ?? "",
        phone: shalom.phone,
        email: shalom.email ?? "",
        groupName: shalom.groupName ?? "",
        teamName: shalom.teamName ?? "",
        registrationDate: shalom.registrationDate ?? "",
        salvationAssurance: shalom.salvationAssurance ?? "",
        training: shalom.training ?? "",
        baptismStatus: shalom.baptismStatus ?? "",
        photo: shalom.photo ?? "",
        note: noteCombined,
        order: 0,
      },
    }),
  ]);

  return roster;
}
