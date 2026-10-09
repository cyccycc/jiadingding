import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto grid max-w-lg gap-4 px-5 py-20">
      <h1 className="font-serif text-4xl">没有这一页</h1>
      <p className="text-muted-foreground">链接可能写错了，或者这件盯价不属于你。</p>
      <Button asChild className="w-fit">
        <Link href="/">回首页</Link>
      </Button>
    </main>
  );
}
