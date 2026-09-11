import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "kivu-ai",
    aiProvider: "anthropic",
    timestamp: new Date().toISOString(),
  });
}
