import { prisma } from "@/lib/prisma";
import { fetchQuote } from "@/lib/prices/fetch-quote";
import { decideNotification } from "@/lib/rules";
import { deliverNotification } from "@/lib/notify";

export type CheckResult = {
  watchId: string;
  ok: boolean;
  notified: boolean;
  salePrice: number | null;
  error: string | null;
  reason: string | null;
};

export async function checkWatch(watchId: string): Promise<CheckResult> {
  const watch = await prisma.watch.findUnique({
    where: { id: watchId },
    include: { user: { select: { email: true } } },
  });
  if (!watch) {
    return { watchId, ok: false, notified: false, salePrice: null, error: "盯价不存在", reason: null };
  }

  const prior = await prisma.priceCheck.count({ where: { watchId, ok: true } });
  const checkedAt = new Date();

  try {
    const quote = await fetchQuote(watch.url, prior);
    const joinPrice = watch.joinPrice ?? quote.salePrice;
    const decision = decideNotification({
      ruleType: watch.ruleType,
      targetPrice: watch.targetPrice,
      dropPercent: watch.dropPercent,
      joinPrice,
      lastNotifiedPrice: watch.lastNotifiedPrice,
      salePrice: quote.salePrice,
    });

    let notified = false;
    let notifyError: string | null = null;
    if (decision.notify) {
      try {
        const delivered = await deliverNotification({
          to: watch.user.email,
          watchId: watch.id,
          title: quote.title || watch.title,
          url: watch.url,
          salePrice: quote.salePrice,
          listPrice: quote.listPrice,
          joinPrice,
        });
        await prisma.notification.create({
          data: {
            watchId: watch.id,
            salePrice: quote.salePrice,
            channel: delivered.channel,
            subject: delivered.subject,
            body: delivered.text,
            outboxPath: delivered.outboxPath,
          },
        });
        notified = true;
      } catch (error) {
        notifyError = error instanceof Error ? error.message : "发信失败";
        console.error(`[价盯盯] 发信失败 ${watch.id}`, error);
      }
    }

    await prisma.priceCheck.create({
      data: {
        watchId: watch.id,
        ok: true,
        salePrice: quote.salePrice,
        listPrice: quote.listPrice,
        checkedAt,
      },
    });
    await prisma.watch.update({
      where: { id: watch.id },
      data: {
        title: watch.title === watch.url || !watch.title ? quote.title : watch.title,
        joinPrice,
        lastPrice: quote.salePrice,
        lastListPrice: quote.listPrice,
        lastCheckedAt: checkedAt,
        lastNotifiedPrice: notified ? quote.salePrice : watch.lastNotifiedPrice,
      },
    });

    return {
      watchId: watch.id,
      ok: true,
      notified,
      salePrice: quote.salePrice,
      error: notifyError,
      reason: decision.reason,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "检查失败";
    await prisma.priceCheck.create({
      data: { watchId: watch.id, ok: false, error: message, checkedAt },
    });
    await prisma.watch.update({
      where: { id: watch.id },
      data: { lastCheckedAt: checkedAt },
    });
    return { watchId: watch.id, ok: false, notified: false, salePrice: null, error: message, reason: null };
  }
}

export async function checkAllEnabled() {
  const watches = await prisma.watch.findMany({
    where: { enabled: true },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  const results: CheckResult[] = [];
  for (const watch of watches) {
    results.push(await checkWatch(watch.id));
  }
  return {
    checked: results.length,
    notified: results.filter((result) => result.notified).length,
    failed: results.filter((result) => !result.ok).length,
    results,
  };
}
