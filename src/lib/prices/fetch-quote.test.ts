import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import { fetchQuote, selectAdapter } from "./fetch-quote";
import { decodePage, fetchFailureMessage, loadPage } from "./page";
import { HTML_PRICE_MISSING } from "./messages";

const fixture = (name: string) => fs.readFileSync(path.join(process.cwd(), "src/lib/prices/fixtures", name), "utf8");
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("报价入口", () => {
  it("mock:// 仍按检查次数变价", async () => {
    const first = await fetchQuote("mock://earbuds", 0);
    const second = await fetchQuote("mock://earbuds", 1);
    assert.equal(first.source, "mock");
    assert.equal(first.salePrice, 699);
    assert.equal(second.salePrice, 549);
    assert.equal(selectAdapter("mock://lamp"), "mock");
  });

  it("按链接选择适配器，夹具页面不访问外网", async () => {
    globalThis.fetch = async () => {
      throw new Error("不应访问网络");
    };
    const brand = await fetchQuote("https://www.apple.com.cn/shop/buy-iphone/iphone-16", 0, {
      loadPage: async () => ({
        status: 200,
        finalUrl: "https://www.apple.com.cn/shop/buy-iphone/iphone-16",
        html: fixture("brand-aggregate.html"),
      }),
    });
    assert.equal(brand.source, "brand");
    assert.equal(brand.salePrice, 5999);

    const jd = await fetchQuote("https://item.jd.com/100086.html", 1, {
      loadPage: async () => ({
        status: 200,
        finalUrl: "https://item.jd.com/100086.html",
        html: fixture("jd-visible-price.html"),
      }),
    });
    assert.equal(jd.source, "jd");
    assert.equal(jd.salePrice, 459);

    const html = await fetchQuote("http://localhost:3000/demo/tote", 0, {
      loadPage: async () => ({
        status: 200,
        finalUrl: "http://localhost:3000/demo/tote",
        html: fixture("brand-og-price.html"),
      }),
    });
    assert.equal(html.source, "html");
    assert.equal(html.salePrice, 128);
    assert.equal(selectAdapter("https://example.com/product"), "html");
  });

  it("通用页面没有价格时沿用原来的错误", async () => {
    await assert.rejects(
      () =>
        fetchQuote("https://example.com/empty", 0, {
          loadPage: async () => ({ status: 200, finalUrl: "https://example.com/empty", html: "<title>空</title>" }),
        }),
      (error: unknown) => error instanceof Error && error.message === HTML_PRICE_MISSING,
    );
  });

  it("抓取时标明身份，不带 Cookie，并拒绝过大的页面", async () => {
    const calls: RequestInit[] = [];
    globalThis.fetch = async (_input, init) => {
      calls.push(init ?? {});
      return new Response("<html>价格</html>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    };
    const page = await loadPage("https://example.com/item");
    assert.equal(page.html.includes("价格"), true);
    assert.equal(page.status, 200);
    const headers = new Headers(calls[0]?.headers);
    assert.equal(headers.get("user-agent"), "JiaDingDing/0.1 (price watch)");
    assert.equal(headers.get("cookie"), null);
    assert.equal(calls[0]?.cache, "no-store");
    assert.equal(calls[0]?.credentials, "omit");
    assert.equal(calls[0]?.redirect, "follow");

    globalThis.fetch = async () => new Response("x", { status: 200, headers: { "content-length": "2000000" } });
    await assert.rejects(() => loadPage("https://example.com/big"), /页面过大，无法解析/);
  });

  it("按声明的编码解码页面", () => {
    const utf8 = Buffer.from("<meta charset=\"gbk\">价格", "utf8");
    assert.equal(decodePage(utf8, "text/html; charset=utf-8"), "<meta charset=\"gbk\">价格");
    const gbk = Uint8Array.from([...Buffer.from('<meta charset="gbk">'), 0xbc, 0xdb, 0xb8, 0xf1]);
    assert.equal(decodePage(gbk, null), '<meta charset="gbk">价格');
    assert.equal(fetchFailureMessage(Object.assign(new Error("timed out"), { name: "TimeoutError" })), "页面请求超时");
    assert.equal(fetchFailureMessage(new Error("reset")), "页面请求失败");
  });
});
