"use client";

// Print-only layout for the weekly Care Notes. Renders nothing on screen;
// toggled visible via `@media print` rules in the parent page. 8 rows per
// printed page, max 16 per team; teams pad to an even page count so each
// team starts on a fresh sheet's front when printed double-sided.

import { formatBirthdayMDYSlash } from "@/lib/weekRange";

interface CareNoteRow {
  name: string;
  birthday: string;
  phone: string;
  photo: string;
  gender: string;
}

interface CareNoteTeam {
  teamId: string;
  teamName: string;
  groupName: string;
  groupColor: string;
  leader: CareNoteRow | null;
  members: CareNoteRow[];
  sundayLabel: string;
}

interface Props {
  teams: CareNoteTeam[];
  // When set, only this team's pages are rendered into the print output.
  filterTeamId?: string | null;
}

const ROWS_PER_PAGE = 8;

type Row =
  | { kind: "leader"; row: CareNoteRow }
  | { kind: "member"; row: CareNoteRow; number: number }
  | { kind: "blank" };

// Map palette color key → hard RGB for print fidelity. Matches chipClassFor palette.
const BANNER_BG: Record<string, string> = {
  red: "#fecaca",
  orange: "#fed7aa",
  amber: "#fde68a",
  yellow: "#fef08a",
  lime: "#d9f99d",
  green: "#bbf7d0",
  emerald: "#a7f3d0",
  teal: "#99f6e4",
  cyan: "#a5f3fc",
  blue: "#bfdbfe",
  indigo: "#c7d2fe",
  purple: "#e9d5ff",
  pink: "#fbcfe8",
  gray: "#e5e7eb",
};

function bannerBg(color: string): string {
  return BANNER_BG[color] || BANNER_BG.gray;
}

function buildPagesForTeam(team: CareNoteTeam): Row[][] {
  const rows: Row[] = [];
  if (team.leader) rows.push({ kind: "leader", row: team.leader });
  team.members.forEach((m, i) => rows.push({ kind: "member", row: m, number: i + 1 }));

  const pages: Row[][] = [];
  for (let i = 0; i < rows.length; i += ROWS_PER_PAGE) {
    const chunk = rows.slice(i, i + ROWS_PER_PAGE);
    while (chunk.length < ROWS_PER_PAGE) chunk.push({ kind: "blank" });
    pages.push(chunk);
  }
  if (pages.length === 0) {
    // Empty team — still print one page so the team isn't silent.
    pages.push(new Array(ROWS_PER_PAGE).fill(null).map(() => ({ kind: "blank" })));
  }
  // Ensure even page count for double-sided printing.
  if (pages.length % 2 === 1) {
    pages.push(new Array(ROWS_PER_PAGE).fill(null).map(() => ({ kind: "blank" })));
  }
  return pages;
}

export function CareNotesPrintable({ teams, filterTeamId }: Props) {
  const toRender = filterTeamId ? teams.filter((t) => t.teamId === filterTeamId) : teams;
  return (
    <div className="care-notes-root">
      <style jsx global>{`
        @media print {
          @page {
            size: Letter portrait;
            /* Zero margins so the browser's default header/footer (page title,
               URL, print date/time) has no space to render. The Care Note
               content provides its own 0.5in padding instead. */
            margin: 0;
          }
          html, body {
            background: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          .care-notes-root,
          .care-notes-root * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .care-notes-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .care-note-page {
            page-break-after: always;
            break-after: page;
          }
          .care-note-page:last-child {
            page-break-after: auto;
          }
        }

        /* Hide from screen; only visible when printing */
        .care-notes-root {
          display: none;
        }
        @media print {
          .care-notes-root {
            display: block;
          }
        }

        .care-note-page {
          box-sizing: border-box;
          width: 8.5in;
          height: 11in;
          padding: 0.5in;
          position: relative;
          font-family: system-ui, -apple-system, "Noto Sans KR", sans-serif;
        }
        .care-note-banner {
          text-align: center;
          font-weight: 700;
          font-size: 11pt;
          padding: 6pt 8pt;
          border: 1pt solid #111;
          margin-bottom: 0;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          color-adjust: exact;
        }
        .care-note-subbanner {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 24pt;
          text-align: center;
          font-size: 9pt;
          padding: 4pt 8pt;
          border: 1pt solid #111;
          border-top: 0;
          background: #fff;
        }
        .care-note-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 0;
          table-layout: fixed;
        }
        .care-note-table th,
        .care-note-table td {
          border: 1pt solid #111;
          padding: 2pt;
          font-size: 8pt;
          vertical-align: middle;
          text-align: center;
        }
        .care-note-table th {
          font-weight: 600;
          font-size: 8pt;
          background: #fff;
          height: 0.35in;
        }
        .care-note-colheader-desc {
          line-height: 1.25;
          white-space: normal;
        }
        .care-note-colheader-desc > div {
          display: block;
        }
        .care-note-thcol-num { width: 0.35in; }
        .care-note-thcol-photo { width: 0.95in; }
        .care-note-thcol-name { width: 0.75in; }
        .care-note-thcol-bday { width: 0.75in; }
        .care-note-thcol-phone { width: 1.1in; }
        /* right column gets the remaining width */
        .care-note-row {
          height: 1.125in;
        }
        .care-note-photo-cell {
          text-align: center;
          padding: 2pt !important;
        }
        .care-note-photo {
          width: 0.9in;
          height: 0.9in;
          object-fit: cover;
          object-position: center;
          display: block;
          margin: 0 auto;
        }
        .care-note-num {
          text-align: center;
          font-weight: 600;
        }
        .care-note-leader-tag {
          text-align: center;
          font-weight: 700;
          background: #f3f4f6;
        }
        .care-note-bday, .care-note-phone {
          text-align: center;
        }
      `}</style>

      {toRender.flatMap((team) => {
        const pages = buildPagesForTeam(team);
        const color = bannerBg(team.groupColor);
        return pages.map((rows, pageIdx) => (
          <div key={`${team.teamId}-${pageIdx}`} className="care-note-page">
            <div className="care-note-banner" style={{ background: color }}>
              &lt;YES 청년부 순모임 CARE NOTE {team.sundayLabel}&gt;
            </div>
            <div className="care-note-subbanner">
              <span>출석현황</span>
              <span>
                주일예배출석: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;명&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                순모임 출석: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;명
              </span>
            </div>
            <table className="care-note-table">
              <thead>
                <tr>
                  <th className="care-note-thcol-num" style={{ background: color }}></th>
                  <th className="care-note-thcol-photo" style={{ background: color }}>사진</th>
                  <th className="care-note-thcol-name" style={{ background: color }}>이름</th>
                  <th className="care-note-thcol-bday" style={{ background: color }}>생년월일</th>
                  <th className="care-note-thcol-phone" style={{ background: color }}>전화번호</th>
                  <th className="care-note-colheader-desc" style={{ background: color }}>
                    <div>|| 1. LIFE CIRCUMSTANCE 2. SPIRITUAL STATUS</div>
                    <div>|| 2PR - PRAYER REQUEST &amp; PRAISE REPORT</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="care-note-row">
                    {r.kind === "leader" ? (
                      <>
                        <td className="care-note-leader-tag">순장</td>
                        <td className="care-note-photo-cell">
                          <img
                            className="care-note-photo"
                            src={r.row.photo || "/default-profile.jpg"}
                            alt=""
                          />
                        </td>
                        <td>{r.row.name}</td>
                        <td className="care-note-bday">{formatBirthdayMDYSlash(r.row.birthday)}</td>
                        <td className="care-note-phone">{r.row.phone}</td>
                        <td></td>
                      </>
                    ) : r.kind === "member" ? (
                      <>
                        <td className="care-note-num">{r.number}</td>
                        <td className="care-note-photo-cell">
                          <img
                            className="care-note-photo"
                            src={r.row.photo || "/default-profile.jpg"}
                            alt=""
                          />
                        </td>
                        <td>{r.row.name}</td>
                        <td className="care-note-bday">{formatBirthdayMDYSlash(r.row.birthday)}</td>
                        <td className="care-note-phone">{r.row.phone}</td>
                        <td></td>
                      </>
                    ) : (
                      <>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ));
      })}
    </div>
  );
}
