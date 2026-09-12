import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import mammoth from "mammoth";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

async function requireUser(req: NextRequest) {
  const token = req.cookies.get("kivu_session")?.value;
  if (!token) throw new Error("Unauthorized");
  return readSession(token);
}

function clean(text: string) {
  return text
    .replace(/\u0000/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isImage(type: string, name: string) {
  return (
    type.startsWith("image/") ||
    /\.(png|jpe?g|webp|gif)$/i.test(name)
  );
}

function isPdf(type: string, name: string) {
  return type === "application/pdf" || /\.pdf$/i.test(name);
}

function isTextFile(type: string, name: string) {
  return (
    type.startsWith("text/") ||
    /\.(txt|md|csv|json)$/i.test(name)
  );
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

function getGeminiText(data: any) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((part: any) => typeof part?.text === "string")
    .map((part: any) => part.text)
    .join("\n")
    .trim();
}

async function callGemini(parts: any[], apiKey: string) {
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/" +
      encodeURIComponent(model) +
      ":generateContent?key=" +
      encodeURIComponent(apiKey),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text:
                "You are KIVU AI. Carefully inspect the uploaded material and extract the information that will help another AI answer the user's question accurately. Preserve important facts, questions, tables, headings and instructions. For exam papers, identify the questions clearly. For images and scanned documents, describe and transcribe useful visible content. Return clean, well-structured text.",
            },
          ],
        },
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 7000,
        },
      }),
      cache: "no-store",
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const providerMessage =
      typeof data?.error?.message === "string"
        ? data.error.message
        : "Gemini API request failed.";

    console.error("Gemini material analysis error:", response.status, providerMessage);

    if (response.status === 401 || response.status === 403) {
      throw new Error("The Gemini API key is invalid or does not have permission.");
    }
    if (response.status === 404) {
      throw new Error("The selected Gemini model is not available. Check GEMINI_MODEL.");
    }
    if (response.status === 429) {
      throw new Error("The Gemini free limit has been reached. Please wait and try again.");
    }
    throw new Error(providerMessage);
  }

  const text = getGeminiText(data);
  if (!text) {
    throw new Error("Gemini did not return an analysis for this file.");
  }

  return text;
}

export async function POST(req: NextRequest) {
  try {
    await requireUser(req);

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "AI is not configured. Add GEMINI_API_KEY in Hostinger Environment Variables.",
        },
        { status: 503 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Choose a file first." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "The uploaded file is empty." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Maximum file size is 20 MB." },
        { status: 400 }
      );
    }

    const name = file.name;
    const type = mimeTypeFor(file);
    let text = "";

    if (isTextFile(type, name)) {
      const raw = clean(await file.text());
      if (!raw) throw new Error("No readable text was found in this file.");

      text = await callGemini(
        [
          {
            text:
              "FILE: " +
              name +
              "\n\nCONTENT:\n" +
              raw.slice(0, 180000),
          },
        ],
        apiKey
      );
    } else if (isDocx(type, name)) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await mammoth.extractRawText({ buffer });
      const raw = clean(result.value || "");

      if (!raw) {
        throw new Error("No readable text was found in this DOCX file.");
      }

      text = await callGemini(
        [
          {
            text:
              "FILE: " +
              name +
              "\n\nCONTENT:\n" +
              raw.slice(0, 180000),
          },
        ],
        apiKey
      );
    } else if (isPdf(type, name) || isImage(type, name)) {
      const bytes = Buffer.from(await file.arrayBuffer());

      text = await callGemini(
        [
          { text: "Analyze this uploaded file: " + name },
          {
            inlineData: {
              mimeType: type,
              data: bytes.toString("base64"),
            },
          },
        ],
        apiKey
      );
    } else if (/\.doc$/i.test(name)) {
      return NextResponse.json(
        {
          error:
            "Legacy .doc files are not supported. Please save the document as PDF or DOCX.",
        },
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
      text,
      provider: "gemini",
    });
  } catch (error) {
    console.error("KIVU AI material analysis error:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Your session has expired. Please sign in again." },
        { status: 401 }
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Unable to analyze this file.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
