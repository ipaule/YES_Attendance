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

    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const desiredOrder = ["사랑", "소망", "믿음"];
    const groupsRaw = await prisma.group.findMany({
      where: { name: { in: desiredOrder } },
    });
    const groups = desiredOrder
      .map((name) => groupsRaw.find((g) => g.name === name))
      .filter(Boolean) as typeof groupsRaw;

    // Collect all data points: { isoDate, dateLabel, groupHere: {사랑:n, 소망:n, 믿음:n} }
    type DataPoint = { isoDate: string; label: string; here: Record<string, number> };
    const allPoints: DataPoint[] = [];

    // 1. Current term data
    const currentData = await Promise.all(
      groups.map((g) => getGroupGraphData(g.id, g.name, "count"))
    );
    // Get actual ISO dates from AttendanceDate
    const dateLabelsToIso: Record<string, string> = {};
    const attDates = await prisma.attendanceDate.findMany({
      where: { team: { groupId: { in: groups.map(g => g.id) } } },
      select: { label: true, date: true },
      distinct: ["label"],
    });
    for (const d of attDates) {
      dateLabelsToIso[d.label] = new Date(d.date).toISOString().slice(0, 10);
    }

    const currentLabels = new Set<string>();
    if (currentData[0]) {
      for (const point of currentData[0].chartData) {
        const label = point.date as string;
        currentLabels.add(label);
        const iso = dateLabelsToIso[label] || "";
        const here: Record<string, number> = {};
        for (const gd of currentData) {
          const match = gd.chartData.find((p: Record<string, string | number>) => p.date === label);
          here[gd.groupName] = match ? ((match._totalHere as number) || 0) : 0;
        }
        allPoints.push({ isoDate: iso, label, here });
      }
    }

    // 2. Historical data from TermHistory (only when date range is specified)
    const useHistory = startDate || endDate;
    const termHistories = useHistory ? await prisma.termHistory.findMany() : [];
    for (const th of termHistories) {
      const data = JSON.parse(th.data) as {
        teams: {
          group: { name: string };
          members: { attendances: { status: string; attendanceDate: { label: string; date: string } }[] }[];
          dates: { label: string; date: string }[];
        }[];
      };

      // Collect dates from this snapshot
      const snapshotDates = new Map<string, { label: string; isoDate: string; here: Record<string, number> }>();

      for (const team of data.teams) {
        const gName = team.group?.name;
        if (!gName || !desiredOrder.includes(gName)) continue;

        for (const dateInfo of team.dates) {
          const iso = dateInfo.date ? new Date(dateInfo.date).toISOString().slice(0, 10) : "";
          const label = dateInfo.label;
          // Skip if this date already exists in current term
          if (currentLabels.has(label) && dateLabelsToIso[label] === iso) continue;

          const key = iso || label;
          if (!snapshotDates.has(key)) {
            snapshotDates.set(key, { label, isoDate: iso, here: {} });
          }
          const entry = snapshotDates.get(key)!;
          if (!entry.here[gName]) entry.here[gName] = 0;

          // Count HERE for this team on this date
          for (const member of team.members) {
            const att = member.attendances.find(a => a.attendanceDate.label === label);
            if (att?.status === "HERE") entry.here[gName]++;
          }
        }
      }

      for (const entry of snapshotDates.values()) {
        allPoints.push(entry);
      }
    }

    // Sort by ISO date
    allPoints.sort((a, b) => a.isoDate.localeCompare(b.isoDate));

    // Filter by date range
    const filtered = allPoints.filter((p) => {
      if (!p.isoDate) return true;
      if (startDate && p.isoDate < startDate) return false;
      if (endDate && p.isoDate > endDate) return false;
      return true;
    });

    // Check if range spans multiple years
    const years = new Set(filtered.map(p => p.isoDate.slice(0, 4)).filter(Boolean));
    const multiYear = years.size > 1;

    // Build chart data
    const rosterCount = mode === "percentage" ? await prisma.rosterMember.count() : 0;

    const combinedChartData = filtered.map((p) => {
      const dateLabel = multiYear && p.isoDate
        ? `${p.isoDate.slice(2, 4)}.${p.label}`
        : p.label;

      const point: Record<string, string | number> = { date: dateLabel };
      let totalHere = 0;

      for (const gName of desiredOrder) {
        const here = p.here[gName] || 0;
        if (mode === "count") {
          point[gName] = here;
        } else {
          point[gName] = 0; // per-group % not meaningful for historical
        }
        totalHere += here;
      }

      if (mode === "count") {
        point["합산"] = totalHere;
      } else {
        point["합산"] = rosterCount > 0 ? Math.round((totalHere / rosterCount) * 100) : 0;
      }

      // Include raw attended count for hover stats
      point._attended = totalHere;

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
