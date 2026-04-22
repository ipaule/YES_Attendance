-- Add new columns to RosterMember
ALTER TABLE "RosterMember" ADD COLUMN "englishName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RosterMember" ADD COLUMN "birthday" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RosterMember" ADD COLUMN "email" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RosterMember" ADD COLUMN "phone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RosterMember" ADD COLUMN "address" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RosterMember" ADD COLUMN "salvationAssurance" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RosterMember" ADD COLUMN "training" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RosterMember" ADD COLUMN "memberNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RosterMember" ADD COLUMN "prayerRequest" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RosterMember" ADD COLUMN "peerGroup" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RosterMember" ADD COLUMN "recentAttendanceOverride" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RosterMember" ADD COLUMN "contactStatus" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RosterMember" ADD COLUMN "personStatus" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RosterMember" ADD COLUMN "statusReason" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RosterMember" ADD COLUMN "assignee" TEXT NOT NULL DEFAULT '';

-- Add new columns to ShalomMember
ALTER TABLE "ShalomMember" ADD COLUMN "englishName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ShalomMember" ADD COLUMN "movedToRosterAt" DATETIME;

-- Create DropdownOption table
CREATE TABLE "DropdownOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "DropdownOption_category_value_key" ON "DropdownOption"("category", "value");
