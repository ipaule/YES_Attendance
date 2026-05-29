import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizeRosterName } from "@/lib/roster-names";

export default async function MemberResolverPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "PASTOR") {
    redirect("/dashboard");
  }

  const { memberId } = await params;
  const teamMember = await prisma.member.findUnique({ where: { id: memberId } });

  if (teamMember) {
    // Exact match first (Member.name === RosterMember.name)
    let rosterMember = await prisma.rosterMember.findFirst({
      where: { name: teamMember.name },
    });

    // Suffix-tolerant match: Member.name = '이상민', RosterMember.name = '이상민17'
    // normalizeRosterName strips trailing digits, so find candidates starting with
    // the member name and verify normalization equals member name.
    if (!rosterMember) {
      const candidates = await prisma.rosterMember.findMany({
        where: { name: { startsWith: teamMember.name } },
      });
      rosterMember =
        candidates.find((r) => normalizeRosterName(r.name) === teamMember.name) ?? null;
    }

    if (rosterMember) {
      redirect(`/dashboard/roster/${rosterMember.id}`);
    }
  }

  return (
    <div className="text-center py-12">
      <p className="text-gray-500">이 인원은 로스터에 등록되지 않았습니다.</p>
      <a
        href="/dashboard"
        className="mt-4 inline-block text-sm text-indigo-600 hover:text-indigo-800"
      >
        뒤로
      </a>
    </div>
  );
}
