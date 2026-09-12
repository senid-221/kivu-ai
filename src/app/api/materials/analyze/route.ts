import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { extractDocumentText } from "@/lib/document";

export const runtime = "nodejs";
export const maxDuration = 60;

async function uid(req: NextRequest) {
  const token = req.cookies.get("kivu_session")?.value;
  if (!token) throw new Error("Unauthorized");
  return readSession(token);
}

export async function POST(req: NextRequest) {
  try {
    await uid(req);
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a file first." }, { status: 400 });
    }
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "Maximum file size is 15 MB." }, { status: 400 });
    }

    if (file.type.startsWith("image/")) {
      return NextResponse.json({
        item: { name: file.name, type: file.type },
        text: "[Image attached: " + file.name + "]. The image itself is also sent to the AI vision model."
      });
    }

    const extracted = await extractDocumentText(
      Buffer.from(await file.arrayBuffer()),
      file.name,
      file.type
    );

    const text = extracted.text.slice(0, 120000);
    return NextResponse.json({
      item: { name: file.name, type: file.type },
      text: text || "[No selectable text was found in this document.]",
      pages: extracted.pages,
      truncated: extracted.truncated || false,
      scanned: !text
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to analyze this file.";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}