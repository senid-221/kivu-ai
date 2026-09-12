import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { downloadUrl } from "@/lib/storage";
import { extractDocumentText } from "@/lib/document";

async function uid(req: NextRequest) {
  const token = req.cookies.get("kivu_session")?.value;
  if (!token) throw new Error("Unauthorized");
  return readSession(token);
}

export async function POST(req: NextRequest) {
  try {
    const userId = await uid(req);
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file first." }, { status: 400 });
    if (file.size > 15 * 1024 * 1024) return NextResponse.json({ error: "Maximum file size is 15 MB." }, { status: 400 });

    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = "users/" + userId + "/" + Date.now() + "-" + safe;

    const prep = await fetch(new URL("/api/materials", req.url), {
      method: "POST",
      headers: { cookie: req.headers.get("cookie") || "", "content-type": "application/json" },
      body: JSON.stringify({ name: file.name, type: file.type || "application/octet-stream", size: file.size })
    });
    const prepared = await prep.json();
    if (!prep.ok || !prepared.uploadUrl) throw new Error(prepared.error || "Upload preparation failed.");

    const upload = await fetch(prepared.uploadUrl, {
      method: "PUT",
      headers: { "content-type": file.type || "application/octet-stream" },
      body: file
    });
    if (!upload.ok) throw new Error("Upload failed.");

    const materialId = prepared.item?.id;
    let extractedText = "";

    if (file.type.startsWith("image/")) {
      extractedText = "[Image uploaded: " + file.name + "]. Analyze the image according to the user's question.";
    } else {
      try {
        extractedText = await extractDocumentText(Buffer.from(await file.arrayBuffer()), file.name, file.type);
      } catch {
        extractedText = "";
      }
    }

    if (materialId && extractedText) {
      await prisma.material.update({ where: { id: materialId }, data: { extractedText: extractedText.slice(0, 120000) } });
    }

    return NextResponse.json({
      item: { id: materialId, name: file.name, type: file.type },
      text: extractedText.slice(0, 100000)
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to upload this file." }, { status: 500 });
  }
}