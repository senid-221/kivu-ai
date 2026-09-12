import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { generateGemini } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("kivu_session")?.value;
    if (!token) throw new Error("Unauthorized");
    await readSession(token);

    const { task, projectType, stack } = await req.json();
    if (!task?.trim()) {
      return NextResponse.json({ error: "Describe what you want to build." }, { status: 400 });
    }

    const result = await generateGemini({
      systemInstruction:
        "You are KIVU AI Developer, a senior full-stack engineer. Give practical architecture, implementation plans and clean production-quality code when useful.",
      parts: [
        {
          text:
            "Project type: " +
            (projectType || "Web application") +
            "\nStack: " +
            (stack || "Choose the best stack") +
            "\nRequest: " +
            task,
        },
      ],
    });

    return NextResponse.json({ answer: result.text, model: result.model });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to process this development request.";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 500 }
    );
  }
}
