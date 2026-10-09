import { parseStructuredPrice } from "@/lib/html-price";
import { BLOCKED_MESSAGE, CURRENCY_UNSUPPORTED, JD_PRICE_MISSING, JD_URL_HINT } from "@/lib/prices/messages";
import type { LoadedPage, PageLoader } from "@/lib/prices/page";
import type { Quote } from "@/lib/prices/types";

// 只解析商品页 HTML 里已经公开的价格。不登录、不提交验证码、不伪装客户端。

export const JD_PRODUCT_URLS = [
  { host: "item.jd.com", path: "/{sku}.html", example: "https://item.jd.com/100012043978.html" },
  { host: "item.m.jd.com", path: "/product/{sku}.html", example: "https://item.m.jd.com/product/100012043978.html" },
  { host: "item.jd.hk", path: "/{sku}.html", example: "https://item.jd.hk/100012043978.html" },
  { host: "npcitem.jd.hk", path: "/{sku}.html", example: "https://npcitem.jd.hk/100012043978.html" },
] as const;

const JD_SKU_ROUTES: { host: string; pattern: RegExp }[] = [
  { host: "item.jd.com", pattern: /^\/(\d+)\.html\/?$/ },
  { host: "item.m.jd.com", pattern: /^\/product\/(\d+)\.html\/?$/ },
  { host: "item.jd.hk", pattern: /^\/(\d+)\.html\/?$/ },
  { host: "npcitem.jd.hk", pattern: /^\/(\d+)\.html\/?$/ },
];

const BLOCK_SIGNALS = [
  "京东-欢迎登录",
  "京东验证",
  "安全验证",
  "滑动验证",
  "请完成验证",
  "访问过于频繁",
  "系统检测到您的请求存在异常",
  "risk_handler",
];

const GATE_HOSTS = new Set(["passport.jd.com", "plogin.m.jd.com", "login.jd.com"]);

export function isJdHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return host === "jd.com" || host.endsWith(".jd.com") || host === "jd.hk" || host.endsWith(".jd.hk");
}

export function readJdSku(url: URL) {
  const host = url.hostname.toLowerCase();
  const route = JD_SKU_ROUTES.find((item) => item.host === host);
  return route?.pattern.exec(url.pathname)?.[1] ?? null;
}

export function isJdGateUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (GATE_HOSTS.has(host)) return true;
    if (isJdHost(host) && /\/login(?:\/|$)/i.test(url.pathname)) return true;
    return false;
  } catch {
    return false;
  }
}

export function jdPageBlocked(page: Pick<LoadedPage, "status" | "finalUrl" | "html">) {
  if (page.status === 401 || page.status === 403 || page.status === 429) return true;
  if (isJdGateUrl(page.finalUrl)) return true;
  const sample = page.html.slice(0, 150_000);
  return BLOCK_SIGNALS.some((signal) => sample.includes(signal));
}

export async function quoteJd(url: URL, load: PageLoader): Promise<Quote> {
  const sku = readJdSku(url);
  if (!sku) throw new Error(JD_URL_HINT);
  const page = await load(url.toString());
  return interpretJdPage({ html: page.html, sku, status: page.status, finalUrl: page.finalUrl });
}

export function interpretJdPage(input: { html: string; sku: string; status: number; finalUrl: string }): Quote {
  if (jdPageBlocked(input)) throw new Error(BLOCKED_MESSAGE);
  if (input.status < 200 || input.status >= 300) throw new Error(`页面返回 HTTP ${input.status}`);
  return quoteFromJdHtml(input.html, input.sku);
}

export function quoteFromJdHtml(html: string, sku: string): Quote {
  const structured = parseStructuredPrice(html);
  const structuredOk = structured.price != null && (structured.currency == null || structured.currency === "CNY");
  const domSale = readJdSale(html, sku);
  if (!structuredOk && structured.price != null && structured.currency && structured.currency !== "CNY" && domSale == null) {
    throw new Error(CURRENCY_UNSUPPORTED);
  }
  const salePrice = structuredOk ? structured.price : domSale;
  if (salePrice == null) throw new Error(JD_PRICE_MISSING);
  const listCandidate = structuredOk ? (structured.listPrice ?? readJdList(html)) : readJdList(html);
  return {
    title: jdTitle(html, structured.title, sku),
    salePrice,
    listPrice: listCandidate != null && listCandidate > salePrice ? listCandidate : null,
    currency: "CNY",
    source: "jd",
  };
}

function readJdSale(html: string, sku: string) {
  const skuText = readClassText(html, `J-p-${sku}`);
  if (skuText) {
    const amount = firstPrice(skuText);
    if (amount != null) return amount;
  }
  const block = readClassText(html, "p-price");
  return block ? firstPrice(block) : null;
}

function readJdList(html: string) {
  const origin = readIdText(html, "page_origin_price") ?? readClassText(html, "p-price-origin");
  return origin ? firstPrice(origin) : null;
}

function jdTitle(html: string, structuredTitle: string | null, sku: string) {
  const skuName = cleanTitle(readClassText(html, "sku-name"));
  const doc = cleanJdDocumentTitle(html);
  const structured = cleanTitle(structuredTitle);
  const raw = rawDocumentTitle(html);
  const structuredIsDocumentTitle = structured != null && raw != null && structured === cleanTitle(raw);
  if (structured && !structuredIsDocumentTitle) return structured;
  return skuName || doc || structured || `京东商品 ${sku}`;
}

function rawDocumentTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return null;
  return match[1].replace(/\s+/g, " ").trim() || null;
}

function cleanJdDocumentTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return null;
  return cleanTitle(match[1].replace(/【[^】]*】/g, " ").replace(/[-_|]\s*京东\s*$/g, " "));
}

function cleanTitle(value: string | null | undefined) {
  if (!value) return null;
  const text = decodeBasic(value).replace(/\s+/g, " ").trim();
  return text || null;
}

function firstPrice(text: string) {
  const matches = text.matchAll(/[0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?/g);
  for (const match of matches) {
    const amount = Number(match[0].replace(/,/g, ""));
    if (Number.isFinite(amount) && amount > 0 && amount < 100_000_000) return Math.round(amount * 100) / 100;
  }
  return null;
}

function readClassText(html: string, className: string) {
  return readTaggedText(html, (tag) => classNames(tag).includes(className));
}

function readIdText(html: string, id: string) {
  return readTaggedText(html, (tag) => new RegExp(`\\bid\\s*=\\s*(?:"${id}"|'${id}')`, "i").test(tag));
}

function readTaggedText(html: string, matches: (tag: string) => boolean) {
  const tags = html.matchAll(/<([a-z0-9]+)\b[^>]*>/gi);
  for (const match of tags) {
    if (match[0].startsWith("</") || !matches(match[0])) continue;
    const inner = innerAfter(html, (match.index ?? 0) + match[0].length, match[1]);
    if (inner == null) continue;
    const text = decodeBasic(inner.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    return text;
  }
  return null;
}

function innerAfter(html: string, start: number, tagName: string) {
  const rest = html.slice(start, start + 1200);
  let depth = 1;
  const token = /<\/?([a-z0-9]+)\b[^>]*>/gi;
  for (const match of rest.matchAll(token)) {
    if (match[1].toLowerCase() !== tagName.toLowerCase()) continue;
    depth += match[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return rest.slice(0, match.index);
  }
  return null;
}

function classNames(tag: string) {
  const match = tag.match(/\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
  return (match?.[1] ?? match?.[2] ?? "").split(/\s+/).filter(Boolean);
}

function decodeBasic(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num: string) => String.fromCodePoint(Number(num)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
