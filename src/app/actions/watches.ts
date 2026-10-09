"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { checkWatch } from "@/lib/check";
import { prisma } from "@/lib/prisma";
import { assertWatchUrl } from "@/lib/prices/fetch-quote";
import { safeNextPath } from "@/lib/session";

export type WatchFormState = { error?: string };

function readRule(formData: FormData) {
  const ruleType = String(formData.get("ruleType") || "");
  if (ruleType === "target") {
    const targetPrice = Number(formData.get("targetPrice"));
    if (!Number.isFinite(targetPrice) || targetPrice <= 0 || targetPrice > 100_000_000) {
      return { error: "请填写大于 0 的目标价" } as const;
    }
    return { ruleType, targetPrice, dropPercent: null } as const;
  }
  if (ruleType === "percent") {
    const dropPercent = Number(formData.get("dropPercent"));
    if (!Number.isFinite(dropPercent) || dropPercent <= 0 || dropPercent > 99) {
      return { error: "降幅需要在 0 到 99 之间" } as const;
    }
    return { ruleType, targetPrice: null, dropPercent } as const;
  }
  return { error: "请选择盯价规则" } as const;
}

export async function createWatchAction(_prev: WatchFormState, formData: FormData): Promise<WatchFormState> {
  const user = await requireUser();
  const url = String(formData.get("url") || "").trim();
  if (!url || url.length > 2000) return { error: "请填写商品链接" };

  try {
    assertWatchUrl(url);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "链接无效" };
  }

  const rule = readRule(formData);
  if ("error" in rule) return { error: rule.error };

  const watch = await prisma.watch.create({
    data: {
      userId: user.id,
      url,
      title: url,
      ruleType: rule.ruleType,
      targetPrice: rule.targetPrice,
      dropPercent: rule.dropPercent,
    },
  });

  const result = await checkWatch(watch.id);
  if (!result.ok) {
    await prisma.watch.delete({ where: { id: watch.id } });
    return { error: result.error || "第一次检查失败，盯价未创建" };
  }

  const notice = result.notified ? "notified" : "created";
  redirect(`/dashboard/watches/${watch.id}?notice=${notice}`);
}

export async function toggleWatchAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") || "");
  const returnTo = safeNextPath(String(formData.get("returnTo") || "/dashboard"));
  const watch = await prisma.watch.findFirst({ where: { id, userId: user.id } });
  if (!watch) redirect("/dashboard");
  await prisma.watch.update({ where: { id: watch.id }, data: { enabled: !watch.enabled } });
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}notice=toggled`);
}

export async function checkWatchAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") || "");
  const watch = await prisma.watch.findFirst({ where: { id, userId: user.id } });
  if (!watch) redirect("/dashboard");
  const result = await checkWatch(watch.id);
  const notice = result.notified ? "notified" : result.ok ? "checked" : "error";
  const detail = result.error ? `&detail=${encodeURIComponent(result.error.slice(0, 180))}` : "";
  redirect(`/dashboard/watches/${watch.id}?notice=${notice}${detail}`);
}
