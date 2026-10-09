import { parseHtmlPrice } from "@/lib/html-price";
import { findMockProduct, quoteMock } from "@/lib/prices/mock";
import type { Quote } from "@/lib/prices/types";

const MAX_HTML_BYTES = 1_000_000;

export async function fetchQuote(url: string, priorObservations: number): Promise<Quote> {
  if (url.startsWith("mock:")) return quoteMock(url, priorObservations);
  if (url.startsWith("http://") || url.startsWith("https://")) return fetchHtmlQuote(url);
  throw new Error("只支持 mock:// 或 http(s) 链接");
}

export function assertWatchUrl(url: string) {
  if (url.startsWith("mock:")) {
    if (!findMockProduct(url)) throw new Error("未知的演示商品");
    return;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("请输入有效链接");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("只支持 mock:// 或 http(s) 链接");
  }
}

export async function fetchHtmlQuote(url: string): Promise<Quote> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("请输入有效链接");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("只支持 http(s) 链接");
  }

  const response = await fetch(parsed, {
    redirect: "follow",
    signal: AbortSignal.timeout(12_000),
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "JiaDingDing/0.1 (price watch)",
    },
  });
  if (!response.ok) throw new Error(`页面返回 HTTP ${response.status}`);

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_HTML_BYTES) throw new Error("页面过大，无法解析");
  const html = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  const parsedPrice = parseHtmlPrice(html);
  if (parsedPrice.price == null) throw new Error("页面里没有解析到价格");

  return {
    title: parsedPrice.title || parsed.hostname,
    salePrice: parsedPrice.price,
    listPrice: null,
    currency: "CNY",
    source: "html",
  };
}
