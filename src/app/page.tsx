import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_PRODUCTS } from "@/lib/prices/mock";
import { formatYuan } from "@/lib/money";

const steps = [
  { n: "01", title: "贴上链接", body: "注册后粘贴商品地址，或直接用 mock:// 演示商品。" },
  { n: "02", title: "定一条规则", body: "目标价：现价小于等于它。降幅：相对加入时的价格下降百分之几。" },
  { n: "03", title: "到价才写信", body: "后台检查、立刻检查或定时任务都会看价格。没降够，就不打扰。" },
];

export default function HomePage() {
  return (
    <main>
      <section className="mx-auto grid max-w-5xl items-center gap-10 px-5 py-14 md:grid-cols-[1.15fr_0.85fr] md:py-20">
        <div>
          <p className="text-sm tracking-[0.22em] text-primary">价格信使</p>
          <h1 className="mt-4 max-w-xl font-serif text-5xl leading-[1.15] text-balance md:text-6xl">
            降价了，才写信给你
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
            把商品交给价盯盯。价格落到目标，或者比你加入时降够比例，它才写一封信。其余时间保持安静。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/try/earbuds">用耳机试一次</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/demo/tote">看本地商品页</Link>
            </Button>
          </div>
        </div>
        <Card className="rotate-[-1.5deg] border-primary/20 bg-[#fffaf6] shadow-md">
          <CardHeader>
            <CardTitle className="font-serif text-2xl">一封还没发出的信</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm leading-6">
            <p>主题：云感降噪耳机 降到 ¥549</p>
            <p className="text-muted-foreground">加入时 ¥699 · 标价 ¥899</p>
            <p>第二次检查才会降。第一次只记下价格，不写信。</p>
            <p className="pt-2 text-primary">同一价格不会再写，除非再降至少 ¥0.5。</p>
          </CardContent>
        </Card>
      </section>

      <section className="border-y border-border/80 bg-[#fffdf8]">
        <div className="mx-auto grid max-w-5xl gap-6 px-5 py-12 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.n}>
              <p className="font-serif text-3xl text-primary">{step.n}</p>
              <h2 className="mt-2 text-lg font-semibold">{step.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-3xl">四件演示商品</h2>
            <p className="mt-2 text-sm text-muted-foreground">标价和售价分开。耳机、水壶、键盘会在第二次检查降价，台灯不会。</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {MOCK_PRODUCTS.map((product) => (
            <Card key={product.url}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3 text-lg">
                  {product.title}
                  {product.initialSale === product.laterSale ? <Badge variant="outline">不降价</Badge> : <Badge>会降价</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <p>
                  标价 <span className="text-muted-foreground line-through">{formatYuan(product.listPrice)}</span>
                  <span className="mx-2 text-muted-foreground">售价</span>
                  <span className="font-semibold">{formatYuan(product.initialSale)}</span>
                  {product.laterSale !== product.initialSale ? (
                    <span className="text-primary"> → {formatYuan(product.laterSale)}</span>
                  ) : null}
                </p>
                <p className="text-muted-foreground">{product.note}</p>
                <p className="font-mono text-xs text-muted-foreground">{product.url}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
