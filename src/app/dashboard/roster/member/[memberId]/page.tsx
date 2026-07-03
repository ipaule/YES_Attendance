import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveRosterMember } from "@/lib/roster-match";

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
  const teamMember = await prisma.member.findUnique({
    where: { id: memberId },
    include: { team: { include: { group: true } } },
  });

  if (teamMember) {
    const match = await resolveRosterMember({
      name: teamMember.name,
      teamName: teamMember.team.name,
      groupName: teamMember.team.group.name,
      gender: teamMember.gender,
      birthYear: teamMember.birthYear,
    });

    if (match && !("ambiguous" in match)) {
      redirect(`/dashboard/roster/${match.id}`);
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
