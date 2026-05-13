import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "PASTOR") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { memberId } = await params;
  const shalom = await prisma.shalomMember.findUnique({ where: { id: memberId } });
  if (!shalom) {
    return NextResponse.json({ error: "대상을 찾을 수 없습니다." }, { status: 404 });
  }
  if (shalom.status !== "졸업") {
    return NextResponse.json({ error: "졸업 상태에서만 이동할 수 있습니다." }, { status: 400 });
  }
  if (shalom.movedToRosterAt) {
    return NextResponse.json({ error: "이미 로스터로 이동되었습니다." }, { status: 409 });
  }

  const rosterExisting = await prisma.rosterMember.findFirst({ where: { name: shalom.name } });
  if (rosterExisting) {
    return NextResponse.json({ error: "이미 같은 이름이 로스터에 존재합니다." }, { status: 409 });
  }

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
        address: shalom.address ?? "",
        groupName: shalom.groupName ?? "",
        teamName: shalom.teamName ?? "",
        ministry: shalom.ministry ?? "",
        memberNumber: shalom.memberNumber ?? "",
        registrationDate: shalom.registrationDate ?? "",
        salvationAssurance: shalom.salvationAssurance ?? "",
        training: shalom.training ?? "",
        baptismStatus: shalom.baptismStatus ?? "",
        photo: shalom.photo ?? "",
        prayerRequest: shalom.prayerRequest ?? "",
        note: noteCombined,
        order: 0,
      },
    }),
  ]);

  return NextResponse.json({ roster });
}
