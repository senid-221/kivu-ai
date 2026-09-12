import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function currentUserId(req: NextRequest) {
  const token = req.cookies.get("kivu_session")?.value;
  if (!token) throw new Error("Unauthorized");
  return readSession(token);
}

const fields = {
  name: true, email: true, phone: true, bio: true, location: true,
  education: true, skills: true, avatar: true, cvName: true
} as const;

export async function GET(req: NextRequest) {
  try {
    const id = await currentUserId(req);
    const user = await prisma.user.findUnique({ where: { id }, select: fields });
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const id = await currentUserId(req);
    const body = await req.json();
    const text = (value: unknown) => typeof value === "string" ? value.trim() || null : null;
    const user = await prisma.user.update({
      where: { id },
      data: {
        name: text(body.name),
        phone: text(body.phone),
        bio: text(body.bio),
        location: text(body.location),
        education: text(body.education),
        skills: text(body.skills),
        avatar: typeof body.avatar === "string" ? body.avatar : null,
        cvName: text(body.cvName)
      },
      select: fields
    });
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Unable to save profile changes." }, { status: 400 });
  }
}