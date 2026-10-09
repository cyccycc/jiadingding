import Link from "next/link";
import { notFound } from "next/navigation";
import { checkWatchAction, toggleWatchAction } from "@/app/actions/watches";
import { NoticeBanner } from "@/components/notice-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { formatDateTime, formatYuan } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { describeRule } from "@/lib/rules";

export default async function WatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; detail?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const watch = await prisma.watch.findFirst({
    where: { id, userId: user.id },
    include: {
      checks: { orderBy: { checkedAt: "desc" }, take: 20 },
      notifications: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!watch) notFound();

  const dropped =
    watch.joinPrice != null && watch.lastPrice != null ? Math.round((watch.joinPrice - watch.lastPrice) * 100) / 100 : null;

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-5 py-10">
      <p className="text-sm">
        <Link href="/dashboard" className="text-muted-foreground hover:text-primary">返回列表</Link>
      </p>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-4xl">{watch.title}</h1>
            <Badge variant={watch.enabled ? "default" : "outline"}>{watch.enabled ? "盯着" : "已暂停"}</Badge>
          </div>
          <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{watch.url}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={checkWatchAction}>
            <input type="hidden" name="id" value={watch.id} />
            <Button type="submit">立即检查</Button>
          </form>
          <form action={toggleWatchAction}>
            <input type="hidden" name="id" value={watch.id} />
            <input type="hidden" name="returnTo" value={`/dashboard/watches/${watch.id}`} />
            <Button type="submit" variant="outline">{watch.enabled ? "暂停" : "启用"}</Button>
          </form>
        </div>
      </div>
      <NoticeBanner notice={query.notice} detail={query.detail} />
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">最近售价</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{formatYuan(watch.lastPrice)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">标价</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{formatYuan(watch.lastListPrice)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">加入时</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{formatYuan(watch.joinPrice)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">相对加入价</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{dropped == null ? "—" : dropped > 0 ? `降了 ${formatYuan(dropped)}` : dropped < 0 ? `涨了 ${formatYuan(Math.abs(dropped))}` : "持平"}</CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>规则</CardTitle></CardHeader>
        <CardContent className="text-sm leading-6">
          <p>{describeRule(watch)}</p>
          <p className="text-muted-foreground">上次检查 {formatDateTime(watch.lastCheckedAt)}。已经发过信之后，价格再降至少 ¥0.5 才会再写一封。</p>
        </CardContent>
      </Card>
      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>检查记录</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            {watch.checks.length === 0 ? <p className="text-sm text-muted-foreground">还没有检查。</p> : null}
            {watch.checks.map((check) => (
              <div key={check.id} className="border-b border-border pb-3 text-sm last:border-0">
                <p>{formatDateTime(check.checkedAt)}</p>
                {check.ok ? (
                  <p>售价 {formatYuan(check.salePrice)}{check.listPrice != null ? ` · 标价 ${formatYuan(check.listPrice)}` : ""}</p>
                ) : (
                  <p className="text-destructive">{check.error}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>信件</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            {watch.notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">还没有发信。配置了 SMTP 会走邮箱，否则保存在 data/outbox，并显示在这里。</p>
            ) : null}
            {watch.notifications.map((notice) => (
              <article key={notice.id} className="rounded-lg border border-border bg-[#fffaf6] p-4 text-sm">
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(notice.createdAt)} · {notice.channel === "smtp" ? "邮件" : "本地发件箱"}
                </p>
                <h2 className="mt-1 font-medium">{notice.subject}</h2>
                <pre className="mt-2 whitespace-pre-wrap font-sans leading-6">{notice.body}</pre>
                {notice.outboxPath ? <p className="mt-2 font-mono text-xs text-muted-foreground">{notice.outboxPath}</p> : null}
              </article>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
