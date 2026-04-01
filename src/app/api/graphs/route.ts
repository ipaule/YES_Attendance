import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  canAccessTeam,
  canViewGroupGraph,
  canViewCombinedGraph,
} from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");
  const id = searchParams.get("id");
  const mode = (searchParams.get("mode") || "count") as "count" | "percentage";

  if (scope === "team" && id) {
    const hasAccess = await canAccessTeam(session, id);
    if (!hasAccess) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          orderBy: { order: "asc" },
          include: { attendances: true },
        },
        dates: { orderBy: { order: "asc" } },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "순을 찾을 수 없습니다." }, { status: 404 });
    }

    if (mode === "count") {
      // Count mode: number of HERE per date (not cumulative)
      const chartData = team.dates.map((date) => {
        const point: Record<string, string | number> = { date: date.label };
        let totalHere = 0;

        team.members.forEach((member) => {
          const att = member.attendances.find(
            (a) => a.attendanceDateId === date.id
          );
          const isHere = att?.status === "HERE" ? 1 : 0;
          point[member.name] = isHere;
          totalHere += isHere;
        });

        point["전체"] = totalHere;
        return point;
      });

      // Calculate total attendance count for label
      const totalDates = team.dates.length;
      const seriesWithCount = team.members.map((member) => {
        let hereCount = 0;
        team.dates.forEach((date) => {
          const att = member.attendances.find(
            (a) => a.attendanceDateId === date.id
          );
          if (att?.status === "HERE") hereCount++;
        });
        return `${member.name} (${hereCount}/${totalDates})`;
      });

      const renamedChartData = chartData.map((point) => {
        const renamed: Record<string, string | number> = { date: point.date };
        team.members.forEach((member, i) => {
          renamed[seriesWithCount[i]] = point[member.name] as number;
        });
        renamed["전체"] = point["전체"];
        return renamed;
      });

      return NextResponse.json({
        chartData: renamedChartData,
        series: [...seriesWithCount, "전체"],
        teamName: team.name,
        mode,
      });
    }

    // Percentage mode: cumulative percentage
    const chartData = team.dates.map((date, dateIndex) => {
      const point: Record<string, string | number> = { date: date.label };
      let totalHere = 0;
      let totalEligible = 0;

      team.members.forEach((member) => {
        let hereCount = 0;
        let eligibleCount = 0;

        for (let i = 0; i <= dateIndex; i++) {
          const att = member.attendances.find(
            (a) => a.attendanceDateId === team.dates[i].id
          );
          const status = att?.status || "";
          if (status !== "AWR" && status !== "") {
            eligibleCount++;
            if (status === "HERE") hereCount++;
          }
        }

        point[member.name] = eligibleCount > 0
          ? Math.round((hereCount / eligibleCount) * 100)
          : 0;

        totalHere += hereCount;
        totalEligible += eligibleCount;
      });

      point["전체"] = totalEligible > 0
        ? Math.round((totalHere / totalEligible) * 100)
        : 0;

      return point;
    });

    const lastPoint = chartData.length > 0 ? chartData[chartData.length - 1] : null;
    const seriesWithPct = team.members.map((member) => {
      const pct = lastPoint ? (lastPoint[member.name] as number) : 0;
      return `${member.name} (${pct}%)`;
    });

    const renamedChartData = chartData.map((point) => {
      const renamed: Record<string, string | number> = { date: point.date };
      team.members.forEach((member, i) => {
        renamed[seriesWithPct[i]] = point[member.name] as number;
      });
      renamed["전체"] = point["전체"];
      return renamed;
    });

    return NextResponse.json({
      chartData: renamedChartData,
      series: [...seriesWithPct, "전체"],
      teamName: team.name,
      mode,
    });
  }

  if (scope === "group" && id) {
    if (!canViewGroupGraph(session, id)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    return NextResponse.json(await getGroupGraphData(id, undefined, mode));
  }

  if (scope === "combined") {
    if (!canViewCombinedGraph(session)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const desiredOrder = ["사랑", "소망", "믿음"];
    const groupsRaw = await prisma.group.findMany({
      where: { name: { in: desiredOrder } },
    });
    const groups = desiredOrder
      .map((name) => groupsRaw.find((g) => g.name === name))
      .filter(Boolean) as typeof groupsRaw;

    const allData = await Promise.all(
      groups.map((g) => getGroupGraphData(g.id, g.name, mode))
    );

    const allDatesSet = new Set<string>();
    allData.forEach((gd) => {
      gd.chartData.forEach((point: Record<string, string | number>) => {
        allDatesSet.add(point.date as string);
      });
    });

    const allDates = Array.from(allDatesSet);
    const combinedChartData = allDates.map((date) => {
      const point: Record<string, string | number> = { date };
      let totalHere = 0;
      let totalEligible = 0;

      allData.forEach((gd) => {
        const matching = gd.chartData.find(
          (p: Record<string, string | number>) => p.date === date
        );
        if (matching) {
          if (mode === "count") {
            point[gd.groupName] = (matching._totalHere as number) || 0;
          } else {
            point[gd.groupName] = matching["전체"] || 0;
          }
          totalHere += (matching._totalHere as number) || 0;
          totalEligible += (matching._totalEligible as number) || 0;
        }
      });

      if (mode === "count") {
        point["합산"] = totalHere;
      } else {
        point["합산"] = totalEligible > 0
          ? Math.round((totalHere / totalEligible) * 100)
          : 0;
      }

      return point;
    });

    return NextResponse.json({
      chartData: combinedChartData,
      series: [...groups.map((g) => g.name), "합산"],
      mode,
    });
  }

  return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
}

async function getGroupGraphData(
  groupId: string,
  groupName?: string,
  mode: "count" | "percentage" = "count"
) {
  const teams = await prisma.team.findMany({
    where: { groupId },
    include: {
      members: {
        include: { attendances: true },
      },
      dates: { orderBy: { order: "asc" } },
    },
  });

  const group = groupName
    ? { name: groupName }
    : await prisma.group.findUnique({
        where: { id: groupId },
        select: { name: true },
      });

  const allDatesSet = new Set<string>();
  teams.forEach((team) => {
    team.dates.forEach((d) => allDatesSet.add(d.label));
  });
  const allDates = Array.from(allDatesSet);

  const chartData = allDates.map((dateLabel) => {
    const point: Record<string, string | number> = { date: dateLabel };
    let groupTotalHere = 0;
    let groupTotalEligible = 0;

    teams.forEach((team) => {
      const date = team.dates.find((d) => d.label === dateLabel);
      if (!date) {
        point[team.name] = 0;
        return;
      }

      let teamHere = 0;
      let teamEligible = 0;

      team.members.forEach((member) => {
        const att = member.attendances.find(
          (a) => a.attendanceDateId === date.id
        );
        const status = att?.status || "";
        if (status !== "AWR" && status !== "") {
          teamEligible++;
          if (status === "HERE") teamHere++;
        }
      });

      if (mode === "count") {
        point[team.name] = teamHere;
      } else {
        point[team.name] = teamEligible > 0
          ? Math.round((teamHere / teamEligible) * 100)
          : 0;
      }

      groupTotalHere += teamHere;
      groupTotalEligible += teamEligible;
    });

    if (mode === "count") {
      point["전체"] = groupTotalHere;
    } else {
      point["전체"] = groupTotalEligible > 0
        ? Math.round((groupTotalHere / groupTotalEligible) * 100)
        : 0;
    }
    point._totalHere = groupTotalHere;
    point._totalEligible = groupTotalEligible;

    return point;
  });

  return {
    chartData,
    series: [...teams.map((t) => t.name), "전체"],
    groupName: group?.name || "",
    mode,
  };
}
