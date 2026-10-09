import { matchBrandSite, quoteBrand } from "@/lib/prices/adapters/brand";
import { quoteHtml } from "@/lib/prices/adapters/html";
import { isJdHost, quoteJd } from "@/lib/prices/adapters/jd";
import { findMockProduct, quoteMock } from "@/lib/prices/mock";
import { loadPage, type PageLoader } from "@/lib/prices/page";
import type { Quote } from "@/lib/prices/types";

export type FetchQuoteOptions = {
  loadPage?: PageLoader;
};

export type AdapterId = "mock" | "jd" | "brand" | "html";

export function selectAdapter(url: string): AdapterId {
  if (url.startsWith("mock:")) return "mock";
  const parsed = parseHttpUrl(url);
  if (isJdHost(parsed.hostname)) return "jd";
  if (matchBrandSite(parsed)) return "brand";
  return "html";
}

export async function fetchQuote(url: string, priorObservations: number, options?: FetchQuoteOptions): Promise<Quote> {
  if (url.startsWith("mock:")) return quoteMock(url, priorObservations);
  const parsed = parseHttpUrl(url);
  const load = options?.loadPage ?? loadPage;
  if (isJdHost(parsed.hostname)) return quoteJd(parsed, load);
  const brand = matchBrandSite(parsed);
  if (brand) return quoteBrand(parsed, brand, load);
  return quoteHtml(parsed, load);
}

export function assertWatchUrl(url: string) {
  if (url.startsWith("mock:")) {
    if (!findMockProduct(url)) throw new Error("未知的演示商品");
    return;
  }
  parseHttpUrl(url);
}

function parseHttpUrl(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("请输入有效链接");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("只支持 mock:// 或 http(s) 链接");
  }
  return parsed;
}
