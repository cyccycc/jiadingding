"use server";

import { redirect } from "next/navigation";
import { clearSessionCookie, hashPassword, setSessionCookie, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeNextPath, sessionSecret } from "@/lib/session";

export type AuthState = { error?: string };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!sessionSecret()) return { error: "服务器未配置 SESSION_SECRET" };
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const next = safeNextPath(String(formData.get("next") || "/dashboard"));

  if (!emailPattern.test(email)) return { error: "请填写有效邮箱" };
  if (password.length < 8 || password.length > 72) return { error: "密码需要 8 到 72 位" };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "这个邮箱已经注册" };

  const user = await prisma.user.create({
    data: { email, passwordHash: await hashPassword(password) },
  });
  await setSessionCookie(user.id);
  redirect(next);
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!sessionSecret()) return { error: "服务器未配置 SESSION_SECRET" };
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const next = safeNextPath(String(formData.get("next") || "/dashboard"));

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "邮箱或密码不正确" };
  }
  await setSessionCookie(user.id);
  redirect(next);
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/");
}
