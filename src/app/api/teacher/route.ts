import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { generateGemini } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("kivu_session")?.value;
    if (!token) throw new Error("Unauthorized");
    await readSession(token);

    const { message, subject, level } = await req.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: "Ask your teacher a question." }, { status: 400 });
    }

    const result = await generateGemini({
      systemInstruction:
        "You are KIVU AI Teacher, a patient expert tutor. Teach step by step with examples, then help the student understand.",
      parts: [
        {
          text:
            "Subject: " +
            (subject || "General") +
            "\nLevel: " +
            (level || "Student") +
            "\nQuestion: " +
            message,
        },
      ],
    });

    return NextResponse.json({ answer: result.text, model: result.model });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate a lesson.";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 500 }
    );
  }
}
