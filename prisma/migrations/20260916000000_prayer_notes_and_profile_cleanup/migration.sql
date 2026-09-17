-- Item 1: carry birthday onto team Member rows so 또래 can be computed
-- the same way the roster does it.
ALTER TABLE "Member" ADD COLUMN "birthday" TEXT NOT NULL DEFAULT '';

-- Item 4: dated prayer-request notes, one per (member, date).
CREATE TABLE "PrayerNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "attendanceDateId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PrayerNote_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PrayerNote_attendanceDateId_fkey" FOREIGN KEY ("attendanceDateId") REFERENCES "AttendanceDate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PrayerNote_memberId_attendanceDateId_key" ON "PrayerNote"("memberId", "attendanceDateId");

-- Item 3: remove 주소/사역/교인번호/기도제목 for real — data is not archived.
ALTER TABLE "RosterMember" DROP COLUMN "address";
ALTER TABLE "RosterMember" DROP COLUMN "ministry";
ALTER TABLE "RosterMember" DROP COLUMN "memberNumber";
ALTER TABLE "RosterMember" DROP COLUMN "prayerRequest";

ALTER TABLE "ShalomMember" DROP COLUMN "address";
ALTER TABLE "ShalomMember" DROP COLUMN "ministry";
ALTER TABLE "ShalomMember" DROP COLUMN "memberNumber";
ALTER TABLE "ShalomMember" DROP COLUMN "prayerRequest";
