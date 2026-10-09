import Link from "next/link";
import { WatchForm } from "@/components/watch-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewWatchPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const url = (await searchParams).url ?? "";

  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <p className="mb-4 text-sm">
        <Link href="/dashboard" className="text-muted-foreground hover:text-primary">返回列表</Link>
      </p>
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-3xl">添加盯价</CardTitle>
          <CardDescription>创建时会立刻读一次价格，作为加入价。这一次如果还没降到规则以下，不会发信。</CardDescription>
        </CardHeader>
        <CardContent>
          <WatchForm defaultUrl={url} />
        </CardContent>
      </Card>
    </main>
  );
}
