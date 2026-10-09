import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { interpretJdPage, isJdHost, readJdSku, JD_PRODUCT_URLS } from "./adapters/jd";
import { BLOCKED_MESSAGE, JD_PRICE_MISSING, JD_URL_HINT } from "./messages";
import { fetchQuote, selectAdapter } from "./fetch-quote";

const fixture = (name: string) => fs.readFileSync(path.join(process.cwd(), "src/lib/prices/fixtures", name), "utf8");

function page(html: string, sku = "100086", status = 200, finalUrl = `https://item.jd.com/${sku}.html`) {
  return interpretJdPage({ html, sku, status, finalUrl });
}

describe("京东适配器", () => {
  it("只认商品页 URL", () => {
    for (const route of JD_PRODUCT_URLS) {
      assert.equal(selectAdapter(route.example), "jd");
      assert.ok(readJdSku(new URL(route.example)));
    }
    assert.equal(readJdSku(new URL("https://item.jd.com/100086.html?bbtf=1")), "100086");
    assert.equal(readJdSku(new URL("https://item.m.jd.com/product/100086.html")), "100086");
    assert.equal(readJdSku(new URL("https://www.jd.com/")), null);
    assert.equal(readJdSku(new URL("https://search.jd.com/Search?keyword=耳机")), null);
    assert.equal(isJdHost("item.jd.com"), true);
    assert.equal(isJdHost("notjd.com"), false);
  });

  it("读取页面上公开的京东价，并忽略旁边的其他商品", () => {
    const quote = page(fixture("jd-visible-price.html"));
    assert.equal(quote.source, "jd");
    assert.equal(quote.title, "演示机械键盘");
    assert.equal(quote.salePrice, 459);
    assert.equal(quote.listPrice, 499);
    assert.equal(quote.currency, "CNY");
  });

  it("有 JSON-LD Offer 时优先用它，而不是旁边的数字", () => {
    const quote = page(fixture("jd-jsonld.html"));
    assert.equal(quote.salePrice, 699);
    assert.equal(quote.title, "演示降噪耳机");
  });

  it("价格节点是空的，就说明没有公开标价", () => {
    assert.throws(
      () => page(fixture("jd-empty-price.html")),
      (error: unknown) => error instanceof Error && error.message === JD_PRICE_MISSING,
    );
  });

  it("登录页和风控页返回固定提示", () => {
    for (const name of ["jd-login.html", "jd-risk.html"]) {
      assert.throws(
        () => page(fixture(name)),
        (error: unknown) => error instanceof Error && error.message === BLOCKED_MESSAGE,
      );
    }
  });

  it("跳到登录域，或 HTTP 403，同样提示暂无法抓取", () => {
    assert.throws(
      () => page("<html><span class='price J-p-100086'>10</span></html>", "100086", 200, "https://passport.jd.com/new/login.aspx"),
      (error: unknown) => error instanceof Error && error.message === BLOCKED_MESSAGE,
    );
    assert.throws(
      () => page(fixture("jd-visible-price.html"), "100086", 403),
      (error: unknown) => error instanceof Error && error.message === BLOCKED_MESSAGE,
    );
    assert.throws(
      () => page("<html></html>", "100086", 429),
      (error: unknown) => error instanceof Error && error.message === BLOCKED_MESSAGE,
    );
  });

  it("京东首页在发请求前就被拒绝", async () => {
    let called = false;
    await assert.rejects(
      () =>
        fetchQuote("https://www.jd.com/", 0, {
          loadPage: async () => {
            called = true;
            throw new Error("不应请求首页");
          },
        }),
      (error: unknown) => error instanceof Error && error.message === JD_URL_HINT,
    );
    assert.equal(called, false);
  });
});
