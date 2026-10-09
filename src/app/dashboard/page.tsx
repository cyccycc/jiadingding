import Link from "next/link";
import { checkWatchAction, toggleWatchAction } from "@/app/actions/watches";
import { NoticeBanner } from "@/components/notice-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { formatDateTime, formatYuan } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { describeRule } from "@/lib/rules";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; detail?: string }>;
}) {
  const user = await requireUser();
  const query = await searchParams;
  const watches = await prisma.watch.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">我的盯价</h1>
          <p className="mt-2 text-sm text-muted-foreground">停用的盯价不会进入定时检查和 cron。</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/watches/new">添加盯价</Link>
        </Button>
      </div>
      <NoticeBanner notice={query.notice} detail={query.detail} />
      {watches.length === 0 ? (
        <Card>
          <CardContent className="grid gap-3">
            <p>还没有盯价。</p>
            <p className="text-sm text-muted-foreground">从云感降噪耳机开始。第二次检查会从 ¥699 降到 ¥549。</p>
            <Button asChild className="w-fit">
              <Link href="/try/earbuds">用耳机试一次</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {watches.map((watch) => (
            <Card key={watch.id}>
              <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                <div className="grid gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/dashboard/watches/${watch.id}`} className="text-lg font-semibold hover:text-primary">
                      {watch.title}
                    </Link>
                    <Badge variant={watch.enabled ? "default" : "outline"}>{watch.enabled ? "盯着" : "已暂停"}</Badge>
                  </div>
                  <p className="break-all font-mono text-xs text-muted-foreground">{watch.url}</p>
                  <p className="text-sm">
                    {describeRule(watch)}
                    <span className="mx-2 text-muted-foreground">·</span>
                    最近售价 {formatYuan(watch.lastPrice)}
                    {watch.lastListPrice != null ? (
                      <span className="text-muted-foreground"> / 标价 {formatYuan(watch.lastListPrice)}</span>
                    ) : null}
                  </p>
                  <p className="text-sm text-muted-foreground">上次检查 {formatDateTime(watch.lastCheckedAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={checkWatchAction}>
                    <input type="hidden" name="id" value={watch.id} />
                    <Button type="submit" variant="outline">立即检查</Button>
                  </form>
                  <form action={toggleWatchAction}>
                    <input type="hidden" name="id" value={watch.id} />
                    <input type="hidden" name="returnTo" value="/dashboard" />
                    <Button type="submit" variant="secondary">{watch.enabled ? "暂停" : "启用"}</Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
