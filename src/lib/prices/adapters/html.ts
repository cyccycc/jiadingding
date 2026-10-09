import { parseStructuredPrice } from "@/lib/html-price";
import { CURRENCY_UNSUPPORTED, HTML_PRICE_MISSING } from "@/lib/prices/messages";
import { assertOk, type PageLoader } from "@/lib/prices/page";
import type { Quote } from "@/lib/prices/types";

export async function quoteHtml(url: URL, load: PageLoader): Promise<Quote> {
  const page = await load(url.toString());
  assertOk(page);
  return quoteFromHtml(page.html, url.hostname);
}

export function quoteFromHtml(html: string, fallbackTitle: string): Quote {
  const parsed = parseStructuredPrice(html);
  if (parsed.price == null) throw new Error(HTML_PRICE_MISSING);
  if (parsed.currency && parsed.currency !== "CNY") throw new Error(CURRENCY_UNSUPPORTED);
  return {
    title: parsed.title || fallbackTitle,
    salePrice: parsed.price,
    listPrice: parsed.listPrice,
    currency: "CNY",
    source: "html",
  };
}
