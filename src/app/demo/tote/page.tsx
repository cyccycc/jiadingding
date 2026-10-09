const product = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "帆布托特包",
  offers: {
    "@type": "Offer",
    priceCurrency: "CNY",
    price: "128.00",
  },
};

export default function TotePage() {
  return (
    <main className="mx-auto grid max-w-3xl gap-8 px-5 py-14 md:grid-cols-[1.1fr_0.9fr]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(product) }} />
      <div className="grid aspect-[4/5] place-items-center rounded-2xl border border-border bg-[#efe4d2] font-serif text-5xl text-primary">
        包
      </div>
      <div>
        <p className="text-sm tracking-[0.18em] text-primary">本地演示页</p>
        <h1 className="mt-3 font-serif text-5xl">帆布托特包</h1>
        <p className="mt-4 text-muted-foreground">页面里的价格写在 JSON-LD Offer 上。把这个地址贴进盯价，HTML 适配器会读到 ¥128。</p>
        <p className="mt-6 flex items-end gap-3">
          <span className="text-4xl font-semibold">¥128</span>
          <span className="text-lg text-muted-foreground line-through">¥168</span>
        </p>
        <p className="mt-6 break-all font-mono text-xs text-muted-foreground">http://localhost:3000/demo/tote</p>
      </div>
    </main>
  );
}
