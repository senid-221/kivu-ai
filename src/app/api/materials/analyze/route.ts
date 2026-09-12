import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { generateGemini, GeminiPart, uploadGeminiFile } from "@/lib/gemini";
import mammoth from "mammoth";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 45 * 1024 * 1024;
const INLINE_PDF_LIMIT = 8 * 1024 * 1024;

async function requireUser(req: NextRequest) {
  const token = req.cookies.get("kivu_session")?.value;
  if (!token) throw new Error("Unauthorized");
  return readSession(token);
}

function clean(text: string) {
  return text.replace(/\u0000/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

function isImage(type: string, name: string) {
  return type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(name);
}

function isPdf(type: string, name: string) {
  return type === "application/pdf" || /\.pdf$/i.test(name);
}

function isTextFile(type: string, name: string) {
  return type.startsWith("text/") || /\.(txt|md|csv|json)$/i.test(name);
}

function isDocx(type: string, name: string) {
  return (
    type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    /\.docx$/i.test(name)
  );
}

function mimeTypeFor(file: File) {
  if (file.type) return file.type;
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (/\.jpe?g$/i.test(lower)) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "application/octet-stream";
}

const MATERIAL_PROMPT =
  "You are KIVU AI's document reader. Read the uploaded material completely and accurately before answering. For PDFs, use native document understanding: inspect both selectable text and every visible page, including scanned pages, photos, tables, diagrams, charts and exam questions. Do not say a file cannot be read unless the file itself is corrupted or unreadable. Extract the important content faithfully, preserve headings and question numbering, and clearly identify questions, answers and instructions in exam papers. Return clean plain text without Markdown symbols.";

async function analyze(parts: GeminiPart[]) {
  return generateGemini({
    parts,
    systemInstruction: MATERIAL_PROMPT,
    temperature: 0.2,
    maxOutputTokens: 7000,
  });
}

export async function POST(req: NextRequest) {
  try {
    await requireUser(req);

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a file first." }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Maximum file size is 45 MB." }, { status: 400 });
    }

    const name = file.name;
    const type = mimeTypeFor(file);
    let result;

    if (isTextFile(type, name)) {
      const raw = clean(await file.text());
      if (!raw) throw new Error("No readable text was found in this file.");

      result = await analyze([
        { text: "FILE: " + name + "\n\nCONTENT:\n" + raw.slice(0, 180000) },
      ]);
    } else if (isDocx(type, name)) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const extracted = await mammoth.extractRawText({ buffer });
      const raw = clean(extracted.value || "");

      if (!raw) throw new Error("No readable text was found in this DOCX file.");

      result = await analyze([
        { text: "FILE: " + name + "\n\nCONTENT:\n" + raw.slice(0, 180000) },
      ]);
    } else if (isPdf(type, name)) {
      const bytes = Buffer.from(await file.arrayBuffer());

      // Small PDFs are sent directly. Larger PDFs use Gemini's Files API,
      // which is more reliable and avoids oversized base64 JSON requests.
      if (bytes.byteLength > INLINE_PDF_LIMIT) {
        try {
          const uploaded = await uploadGeminiFile(bytes, "application/pdf", name);
          result = await analyze([
            { text: "Read and analyze this PDF completely: " + name },
            {
              fileData: {
                mimeType: uploaded.mimeType,
                fileUri: uploaded.uri,
              },
            },
          ]);
        } catch (uploadError) {
          // Fall back to inline data when temporary file upload is unavailable.
          console.warn("Gemini Files upload failed; trying inline PDF:", uploadError);
          result = await analyze([
            { text: "Read and analyze this PDF completely, including scanned pages: " + name },
            {
              inlineData: {
                mimeType: "application/pdf",
                data: bytes.toString("base64"),
              },
            },
          ]);
        }
      } else {
        result = await analyze([
          { text: "Read and analyze this PDF completely, including scanned pages: " + name },
          {
            inlineData: {
              mimeType: "application/pdf",
              data: bytes.toString("base64"),
            },
          },
        ]);
      }
    } else if (isImage(type, name)) {
      const bytes = Buffer.from(await file.arrayBuffer());
      result = await analyze([
        { text: "Read and analyze all useful visible content in this image: " + name },
        {
          inlineData: {
            mimeType: type,
            data: bytes.toString("base64"),
          },
        },
      ]);
    } else if (/\.doc$/i.test(name)) {
      return NextResponse.json(
        { error: "Legacy .doc files are not supported. Please save the document as PDF or DOCX." },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        {
          error:
            "Unsupported file format. Upload PDF, DOCX, TXT, CSV, PNG, JPG, JPEG, WEBP or GIF.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      item: { name, type },
      text: result.text,
      provider: "gemini",
      model: result.model,
    });
  } catch (error) {
    console.error("KIVU AI material analysis error:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Your session has expired. Please sign in again." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to analyze this file.",
      },
      { status: 500 }
    );
  }
}
