import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";

async function uid(req: NextRequest) {
  const token = req.cookies.get("kivu_session")?.value;
  if (!token) throw new Error("Unauthorized");
  return readSession(token);
}

export async function GET(req: NextRequest) {
  try {
    const userId = await uid(req);
    const items = await prisma.studyReminder.findMany({
      where: { userId },
      orderBy: { time: "asc" },
    });
    return NextResponse.json(items);
  } catch {
    return NextResponse.json([], { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await uid(req);
    const { title, time, days } = await req.json();

    if (typeof title !== "string" || !title.trim() || typeof time !== "string" || !time) {
      return NextResponse.json({ error: "Enter a reminder title and time." }, { status: 400 });
    }

    const item = await prisma.studyReminder.create({
      data: {
        title: title.trim().slice(0, 120),
        time,
        days: typeof days === "string" && days ? days : "Every day",
        userId,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to save reminder." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await uid(req);
    const { id, enabled } = await req.json();
    const reminder = await prisma.studyReminder.findFirst({
      where: { id: String(id), userId },
    });

    if (!reminder) {
      return NextResponse.json({ error: "Reminder not found." }, { status: 404 });
    }

    const item = await prisma.studyReminder.update({
      where: { id: reminder.id },
      data: { enabled: Boolean(enabled) },
    });

    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Unable to update reminder." }, { status: 500 });
  }
}
