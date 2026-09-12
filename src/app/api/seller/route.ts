import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { generateGemini } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("kivu_session")?.value;
    if (!token) throw new Error("Unauthorized");
    await readSession(token);

    const { message, businessType, goal } = await req.json();
    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Describe your business situation or question." },
        { status: 400 }
      );
    }

    const result = await generateGemini({
      systemInstruction:
        "You are KIVU AI Seller, an ethical business, sales and marketing advisor. Give practical actions, examples and measurable next steps.",
      parts: [
        {
          text:
            "Business: " +
            (businessType || "General") +
            "\nGoal: " +
            (goal || "Grow sales") +
            "\nRequest: " +
            message,
        },
      ],
    });

    return NextResponse.json({ answer: result.text, model: result.model });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to process this business request.";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 500 }
    );
  }
}
