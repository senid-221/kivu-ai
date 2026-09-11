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
    const items = await prisma.conversation.findMany({
      where: { userId },
      include: { messages: true },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await uid(req);
    const body = await req.json();
    const title = typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, 120) : "New conversation";
    const model = typeof body.model === "string" ? body.model : "teacher";
    const messages = Array.isArray(body.messages) ? body.messages : [];

    const safeMessages = messages
      .filter((message) => message && (message.role === "user" || message.role === "assistant") && typeof message.content === "string")
      .map((message) => ({ role: message.role, content: message.content.slice(0, 20000) }));

    if (body.id) {
      const existing = await prisma.conversation.findFirst({ where: { id: String(body.id), userId } });
      if (!existing) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

      await prisma.message.deleteMany({ where: { conversationId: existing.id } });
      const item = await prisma.conversation.update({
        where: { id: existing.id },
        data: {
          title,
          model,
          messages: { create: safeMessages },
        },
        include: { messages: true },
      });
      return NextResponse.json({ item });
    }

    const item = await prisma.conversation.create({
      data: {
        title,
        model,
        userId,
        messages: { create: safeMessages },
      },
      include: { messages: true },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to save this conversation." }, { status: 500 });
  }
}
