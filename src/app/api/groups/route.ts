import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const groups = await prisma.group.findMany({
    orderBy: { order: "asc" },
    select: { id: true, name: true, order: true },
  });
  return NextResponse.json({ groups });
}
