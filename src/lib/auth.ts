import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, sessionSecret, signSession, verifySession } from "@/lib/session";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 14;

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function setSessionCookie(userId: string) {
  const secret = sessionSecret();
  if (!secret) throw new Error("服务器未配置 SESSION_SECRET");
  const token = await signSession(userId, secret);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, cookieOptions());
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
}

export async function readSession() {
  const secret = sessionSecret();
  if (!secret) return null;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token, secret);
}

export async function getCurrentUser() {
  const session = await readSession();
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.uid },
    select: { id: true, email: true },
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
