import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { BRAND_SITES, matchBrandSite, quoteFromBrandHtml } from "./adapters/brand";
import { BLOCKED_MESSAGE, CURRENCY_UNSUPPORTED, brandPriceMissing } from "./messages";
import { fetchQuote, selectAdapter } from "./fetch-quote";

const fixture = (name: string) => fs.readFileSync(path.join(process.cwd(), "src/lib/prices/fixtures", name), "utf8");

describe("品牌官网适配器", () => {
  it("文档示例链接命中品牌站，而不是京东或通用 HTML", () => {
    for (const site of BRAND_SITES) {
      const url = new URL(site.example);
      assert.equal(matchBrandSite(url)?.id, site.id);
      assert.equal(selectAdapter(site.example), "brand");
    }
    assert.equal(matchBrandSite(new URL("https://www.apple.com.cn/shop/product/MYW23CH/A"))?.id, "apple-cn");
    assert.equal(matchBrandSite(new URL("https://notapple.com/shop/buy-iphone/iphone-16")), null);
    assert.equal(matchBrandSite(new URL("https://apple.com.evil.com/")), null);
  });

  it("JSON-LD AggregateOffer 读起始价和最高价", () => {
    const quote = quoteFromBrandHtml(fixture("brand-aggregate.html"), "Apple 中国");
    assert.equal(quote.source, "brand");
    assert.equal(quote.title, "演示降噪耳机");
    assert.equal(quote.salePrice, 5999);
    assert.equal(quote.listPrice, 8999);
    assert.equal(quote.currency, "CNY");
  });

  it("priceSpecification 里的售价优先于标价和 og:price", () => {
    const quote = quoteFromBrandHtml(fixture("brand-price-spec.html"), "Apple 中国");
    assert.equal(quote.salePrice, 7999);
    assert.equal(quote.listPrice, 8999);
    assert.equal(quote.title, "演示降噪耳机");
  });

  it("没有 JSON-LD 时读取 og:price", () => {
    const quote = quoteFromBrandHtml(fixture("brand-og-price.html"), "Apple 中国");
    assert.equal(quote.salePrice, 128);
    assert.equal(quote.title, "帆布托特包");
  });

  it("最后读取 itemprop=price 的文本", () => {
    const quote = quoteFromBrandHtml(fixture("brand-itemprop.html"), "Apple 中国");
    assert.equal(quote.salePrice, 239.5);
    assert.equal(quote.title, "亚麻衬衫");
  });

  it("没有公开标价时返回中文错误", () => {
    assert.throws(
      () => quoteFromBrandHtml(fixture("brand-no-price.html"), "Apple 中国"),
      (error: unknown) => error instanceof Error && error.message === brandPriceMissing("Apple 中国"),
    );
  });

  it("非人民币标价会拒绝", () => {
    assert.throws(
      () => quoteFromBrandHtml(fixture("brand-usd.html"), "Apple"),
      (error: unknown) => error instanceof Error && error.message === CURRENCY_UNSUPPORTED,
    );
  });

  it("403 使用登录或风控提示，且不访问网络", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error("不应访问网络");
    };
    try {
      await assert.rejects(
        () =>
          fetchQuote("https://www.apple.com.cn/shop/buy-iphone/iphone-16", 0, {
            loadPage: async () => ({ status: 403, finalUrl: "https://www.apple.com.cn/shop/buy-iphone/iphone-16", html: "" }),
          }),
        (error: unknown) => error instanceof Error && error.message === BLOCKED_MESSAGE,
      );
    } finally {
      globalThis.fetch = original;
    }
  });
});
