import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";
import { formatYuan } from "@/lib/money";

export type NotificationDraft = {
  to: string;
  watchId: string;
  title: string;
  url: string;
  salePrice: number;
  listPrice: number | null;
  joinPrice: number | null;
};

export function buildNotification(input: Omit<NotificationDraft, "to" | "watchId">) {
  const subject = `【价盯盯】${input.title} 降到 ${formatYuan(input.salePrice)}`;
  const lines = [
    `你盯的「${input.title}」到价了。`,
    "",
    `当前价：${formatYuan(input.salePrice)}`,
    input.listPrice != null ? `标价：${formatYuan(input.listPrice)}` : null,
    input.joinPrice != null ? `加入时：${formatYuan(input.joinPrice)}` : null,
    `链接：${input.url}`,
    "",
    "价盯盯 · 降价了，才写信给你",
  ].filter((line): line is string => line != null);
  return { subject, text: lines.join("\n") };
}

export async function deliverNotification(
  input: NotificationDraft,
  options?: { outboxDir?: string },
) {
  const message = buildNotification(input);
  const host = process.env.SMTP_HOST?.trim();
  if (host && !options?.outboxDir) {
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER?.trim();
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === "true",
      auth: user ? { user, pass: process.env.SMTP_PASS ?? "" } : undefined,
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || user,
      to: input.to,
      subject: message.subject,
      text: message.text,
    });
    console.info(`[价盯盯] 已发信给 ${input.to}：${message.subject}`);
    return { channel: "smtp" as const, outboxPath: null, ...message };
  }

  const directory = options?.outboxDir ?? path.resolve(process.cwd(), "data/outbox");
  fs.mkdirSync(directory, { recursive: true });
  const safeId = input.watchId.replace(/[^a-zA-Z0-9_-]/g, "") || "watch";
  const filename = `${Date.now()}-${safeId}-${Math.random().toString(36).slice(2, 8)}.json`;
  const fullPath = path.join(directory, filename);
  const payload = {
    to: input.to,
    watchId: input.watchId,
    salePrice: input.salePrice,
    subject: message.subject,
    text: message.text,
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(fullPath, JSON.stringify(payload, null, 2));
  console.info(`[价盯盯] 未配置 SMTP，信件写入 ${fullPath}`);
  console.info(message.subject);
  console.info(message.text);
  return {
    channel: "outbox" as const,
    outboxPath: path.relative(process.cwd(), fullPath),
    ...message,
  };
}
