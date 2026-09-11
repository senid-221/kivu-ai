import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";

type Rule = {
  code: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
};

async function uid(req: NextRequest): Promise<string> {
  const token = req.cookies.get("kivu_session")?.value;
  if (!token) throw new Error("Unauthorized");
  return readSession(token);
}

const day = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

function streak(sessions: { completedAt: Date }[]) {
  const days = [...new Set(sessions.map((session) => day(session.completedAt)))].sort(
    (a, b) => b - a,
  );

  let value = 0;
  let expected = day(new Date());

  for (const current of days) {
    if (current === expected) {
      value++;
      expected -= 86400000;
    } else if (current < expected) {
      break;
    }
  }

  return value;
}

async function unlock(
  userId: string,
  type: string,
  score?: number,
  total?: number,
) {
  const count = await prisma.studySession.count({ where: { userId } });

  const rules: Rule[] = [
    {
      code: "first_step",
      title: "First Step",
      description: "Complete your first learning activity.",
      icon: "🌱",
      unlocked: count >= 1,
    },
    {
      code: "quiz_master",
      title: "Quiz Master",
      description: "Score 80% or higher on a quiz.",
      icon: "🧠",
      unlocked: type === "quiz" && !!total && (score ?? 0) / total >= 0.8,
    },
    {
      code: "active_learner",
      title: "Active Learner",
      description: "Complete 10 learning activities.",
      icon: "🔥",
      unlocked: count >= 10,
    },
  ];

  for (const rule of rules) {
    if (!rule.unlocked) continue;

    const achievement = await prisma.achievement.upsert({
      where: { code: rule.code },
      update: {
        title: rule.title,
        description: rule.description,
        icon: rule.icon,
      },
      create: {
        id: rule.code,
        code: rule.code,
        title: rule.title,
        description: rule.description,
        icon: rule.icon,
      },
    });

    await prisma.userAchievement.upsert({
      where: {
        userId_achievementId: {
          userId,
          achievementId: achievement.id,
        },
      },
      update: {},
      create: {
        userId,
        achievementId: achievement.id,
      },
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await uid(req);

    const [materials, sessions, earned] = await Promise.all([
      prisma.material.count({ where: { userId } }),
      prisma.studySession.findMany({
        where: { userId },
        orderBy: { completedAt: "desc" },
      }),
      prisma.userAchievement.findMany({
        where: { userId },
        include: { achievement: true },
        orderBy: { earnedAt: "desc" },
      }),
    ]);

    const quizzes = sessions.filter(
      (session) => session.type === "quiz" && session.total,
    );

    const average = quizzes.length
      ? Math.round(
          quizzes.reduce(
            (sum, session) =>
              sum + (100 * (session.score ?? 0)) / (session.total ?? 1),
            0,
          ) / quizzes.length,
        )
      : 0;

    return NextResponse.json({
      materials,
      quizzes: quizzes.length,
      average,
      flashcards: sessions.filter((session) => session.type === "flashcards").length,
      streak: streak(sessions),
      achievements: earned.map((item) => item.achievement),
      recent: sessions.slice(0, 8),
    });
  } catch {
    return NextResponse.json({
      materials: 0,
      quizzes: 0,
      average: 0,
      flashcards: 0,
      streak: 0,
      achievements: [],
      recent: [],
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await uid(req);
    const body: {
      type?: string;
      score?: number;
      total?: number;
      materialId?: string;
    } = await req.json();

    const type = typeof body.type === "string" && body.type.trim() ? body.type : "learning";

    await prisma.studySession.create({
      data: {
        type,
        score: typeof body.score === "number" ? body.score : null,
        total: typeof body.total === "number" ? body.total : null,
        materialId:
          typeof body.materialId === "string" && body.materialId
            ? body.materialId
            : null,
        userId,
      },
    });

    await unlock(userId, type, body.score, body.total);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to save progress." },
      { status: 500 },
    );
  }
}
