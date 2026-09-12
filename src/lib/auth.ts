import { SignJWT, jwtVerify } from "jose";

function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("Server authentication is not configured.");
  }
  return new TextEncoder().encode(secret || "eduka-development-session");
}

export async function createSession(userId: string) {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(key());
}

export async function readSession(token: string) {
  const { payload } = await jwtVerify(token, key());
  if (typeof payload.userId !== "string") throw new Error("Invalid session.");
  return payload.userId;
}

export async function requireAdmin(token: string | undefined) {
  if (!token) throw new Error("Unauthorized");
  const userId = await readSession(token);
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (!adminEmails.length) {
    throw new Error("Admin access is not configured.");
  }

  const { edukaPrisma } = await import("@/lib/knowledge-rag");
  const user = await edukaPrisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user || !adminEmails.includes(user.email.toLowerCase())) {
    throw new Error("Forbidden");
  }

  return userId;
}
