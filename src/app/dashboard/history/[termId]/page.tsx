"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AttendanceChart } from "@/components/graphs/AttendanceChart";
import {
  calculateAttendanceRate,
  calculateGrade,
  getGradeColor,
} from "@/lib/attendance";

interface TermData {
  id: string;
  name: string;
  createdAt: string;
  data: {
    groups: { id: string; name: string }[];
    teams: {
      id: string;
      name: string;
      group: { id: string; name: string };
      leader: { id: string; username: string } | null;
      members: {
        id: string;
        name: string;
        gender: string;
        birthYear: string;
        order: number;
        attendances: {
          status: string;
          awrReason: string | null;
          attendanceDate: { label: string; date: string };
        }[];
      }[];
      dates: { id: string; label: string; date: string; order: number }[];
    }[];
  };
}

export default function TermDetailPage() {
  const params = useParams();
  const termId = params.termId as string;
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["term", termId],
    queryFn: async (): Promise<TermData> => {
      const res = await fetch(`/api/terms/${termId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-red-500">데이터를 불러올 수 없습니다.</p>
      </div>
    );
  }

  const { teams } = data.data;

  // Group teams by group name
  const groupedTeams: Record<string, typeof teams> = {};
  for (const team of teams) {
    const gName = team.group.name;
    if (!groupedTeams[gName]) groupedTeams[gName] = [];
    groupedTeams[gName].push(team);
  }

  // Build graph data per group
  const groupGraphs = Object.entries(groupedTeams).map(([groupName, gTeams]) => {
    const allDatesSet = new Set<string>();
    gTeams.forEach((t) => t.dates.forEach((d) => allDatesSet.add(d.label)));
    const allDates = Array.from(allDatesSet);

    const chartData = allDates.map((dateLabel) => {
      const point: Record<string, string | number> = { date: dateLabel };
      let totalHere = 0;

      gTeams.forEach((team) => {
        const date = team.dates.find((d) => d.label === dateLabel);
        if (!date) { point[team.name] = 0; return; }

        let teamHere = 0;
        team.members.forEach((member) => {
          const att = member.attendances.find(
            (a) => a.attendanceDate.label === dateLabel
          );
          if (att?.status === "HERE") teamHere++;
        });

        point[team.name] = teamHere;
        totalHere += teamHere;
      });

      point["전체"] = totalHere;
      return point;
    });

    return {
      groupName,
      chartData,
      series: [...gTeams.map((t) => t.name), "전체"],
    };
  });

  return (
    <div className="space-y-6 pb-20 lg:pb-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{data.name}</h1>
          <p className="text-xs text-gray-500">
            {new Date(data.createdAt).toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })} 저장
          </p>
        </div>
      </div>

      {/* Combined graph (합산) */}
      {groupGraphs.length > 0 && (() => {
        const allDatesSet = new Set<string>();
        groupGraphs.forEach((gg) =>
          gg.chartData.forEach((p) => allDatesSet.add(p.date as string))
        );
        const allDates = Array.from(allDatesSet);
        const desiredOrder = ["사랑", "소망", "믿음"];
        const orderedGraphs = desiredOrder
          .map((name) => groupGraphs.find((g) => g.groupName === name))
          .filter(Boolean) as typeof groupGraphs;

        const combinedData = allDates.map((date) => {
          const point: Record<string, string | number> = { date };
          let total = 0;
          orderedGraphs.forEach((gg) => {
            const match = gg.chartData.find((p) => p.date === date);
            const val = match ? (match["전체"] as number) || 0 : 0;
            point[gg.groupName] = val;
            total += val;
          });
          point["합산"] = total;
          return point;
        });

        return (
          <AttendanceChart
            chartData={combinedData}
            series={[...orderedGraphs.map((g) => g.groupName), "합산"]}
            title="사랑 · 소망 · 믿음 합산 출석 인원"
            subtitle="공동체별 출석 인원 추이"
            mode="count"
          />
        );
      })()}

      {/* Group graphs */}
      {groupGraphs.map((gg) => (
        <AttendanceChart
          key={gg.groupName}
          chartData={gg.chartData}
          series={gg.series}
          title={`${gg.groupName} 공동체 출석 인원`}
          subtitle="순별 출석 인원 추이"
          mode="count"
        />
      ))}

      {/* Attendance tables per group */}
      {Object.entries(groupedTeams).map(([groupName, gTeams]) => (
        <div key={groupName} className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800">{groupName} 공동체</h2>

          {gTeams.map((team) => (
            <div
              key={team.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <h3 className="font-semibold text-gray-800">{team.name}</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="sticky left-0 z-10 bg-gray-50 px-1 py-2 text-center font-medium text-gray-400 w-8 min-w-[32px]">#</th>
                      <th className="sticky left-8 z-10 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600 w-16 min-w-[64px]">
                        이름
                      </th>
                      <th className="sticky left-24 z-10 bg-gray-50 px-1 py-2 text-center font-medium text-gray-600 w-10 min-w-[40px] whitespace-nowrap">
                        성별
                      </th>
                      <th className="sticky left-[136px] z-10 bg-gray-50 px-1 py-2 text-center font-medium text-gray-600 w-14 min-w-[56px]">
                        또래
                      </th>
                      {team.dates.map((date) => (
                        <th
                          key={date.label}
                          className="px-1 py-2 text-center font-medium text-gray-600 min-w-[40px]"
                        >
                          <span className="text-xs">{date.label}</span>
                        </th>
                      ))}
                      <th className="px-2 py-2 text-center font-medium text-gray-600 min-w-[50px]">
                        출석률
                      </th>
                      <th className="px-2 py-2 text-center font-medium text-gray-600 min-w-[36px]">
                        등급
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...team.members]
                      .sort((a, b) => {
                        const rateA = calculateAttendanceRate(
                          team.dates.map((d) => {
                            const att = a.attendances.find((at) => at.attendanceDate.label === d.label);
                            return att?.status || "";
                          })
                        );
                        const rateB = calculateAttendanceRate(
                          team.dates.map((d) => {
                            const att = b.attendances.find((at) => at.attendanceDate.label === d.label);
                            return att?.status || "";
                          })
                        );
                        return rateB - rateA;
                      })
                      .map((member, idx) => {
                        const statuses = team.dates.map((date) => {
                          const att = member.attendances.find(
                            (a) => a.attendanceDate.label === date.label
                          );
                          return att?.status || "";
                        });
                        const rate = calculateAttendanceRate(statuses);
                        const grade = calculateGrade(rate);

                        return (
                          <tr
                            key={member.id}
                            className="border-b border-gray-100"
                          >
                            <td className="sticky left-0 z-10 bg-white px-1 py-1.5 text-center text-xs text-gray-400 w-8">{idx + 1}</td>
                            <td className="sticky left-8 z-10 bg-white px-2 py-1.5 text-sm">
                              {member.name}
                            </td>
                            <td className="sticky left-24 z-10 bg-white px-1 py-1.5 text-center text-xs text-gray-500">
                              {member.gender === "MALE" ? "남" : "여"}
                            </td>
                            <td className="sticky left-[136px] z-10 bg-white px-1 py-1.5 text-center text-xs text-gray-500">
                              {member.birthYear}
                            </td>
                            {team.dates.map((date) => {
                              const att = member.attendances.find(
                                (a) => a.attendanceDate.label === date.label
                              );
                              const status = att?.status || "";
                              return (
                                <td
                                  key={date.label}
                                  className="px-1 py-1.5 text-center"
                                  title={
                                    att?.status === "AWR" && att?.awrReason
                                      ? att.awrReason
                                      : undefined
                                  }
                                >
                                  {status === "HERE" && (
                                    <span className="text-green-600 font-bold">O</span>
                                  )}
                                  {status === "ABSENT" && (
                                    <span className="text-red-500 font-bold">X</span>
                                  )}
                                  {status === "AWR" && (
                                    <span className="text-yellow-500 font-bold">△</span>
                                  )}
                                  {!status && (
                                    <span className="text-gray-300">-</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="px-2 py-1.5 text-center text-xs font-medium text-gray-700">
                              {rate.toFixed(0)}%
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <span
                                className={`inline-block text-xs font-bold px-1.5 py-0.5 rounded ${getGradeColor(grade)}`}
                              >
                                {grade}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
