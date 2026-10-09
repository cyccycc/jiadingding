const OFFER_TYPES = new Set(["Offer", "AggregateOffer"]);

export type HtmlPrice = {
  title: string | null;
  price: number | null;
};

export function parseHtmlPrice(html: string): HtmlPrice {
  const jsonLd = readJsonLd(html);
  const title = jsonLd.title ?? readMeta(html, "og:title") ?? readTitle(html);
  if (jsonLd.price != null) return { title, price: jsonLd.price };

  const productAmount = parseAmount(readMeta(html, "product:price:amount"));
  if (productAmount != null) return { title, price: productAmount };

  const openGraphAmount = parseAmount(readMeta(html, "og:price:amount"));
  if (openGraphAmount != null) return { title, price: openGraphAmount };

  return { title, price: readItemPropPrice(html) };
}

function readJsonLd(html: string) {
  const found: { title: string | null; price: number | null } = { title: null, price: null };
  const pattern = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    try {
      collectJsonLd(JSON.parse(match[1]), found);
    } catch {
      continue;
    }
    if (found.price != null && found.title) break;
  }
  return found;
}

function collectJsonLd(node: unknown, found: { title: string | null; price: number | null }) {
  if (Array.isArray(node)) {
    for (const item of node) collectJsonLd(item, found);
    return;
  }
  if (!node || typeof node !== "object") return;
  const record = node as Record<string, unknown>;
  if (record["@graph"]) collectJsonLd(record["@graph"], found);

  const types = jsonTypes(record["@type"]);
  if (!found.title && types.some((type) => type === "Product" || type.endsWith("Product"))) {
    if (typeof record.name === "string") found.title = decodeHtml(record.name);
  }
  if (found.price == null && types.some((type) => OFFER_TYPES.has(type) || type.endsWith("Offer"))) {
    found.price = parseAmount(record.price) ?? parseAmount(record.lowPrice);
  }
  if (record.offers) collectJsonLd(record.offers, found);
}

function jsonTypes(value: unknown) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return [];
}

function readMeta(html: string, key: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const attrs = parseAttributes(tag);
    const name = attrs.property || attrs.name || attrs.itemprop;
    if (name?.toLowerCase() === key.toLowerCase() && attrs.content) {
      return decodeHtml(attrs.content);
    }
  }
  return null;
}

function readItemPropPrice(html: string) {
  const tags = html.match(/<[a-z0-9]+\b[^>]*\bitemprop\s*=\s*["']price["'][^>]*>/gi) ?? [];
  for (const tag of tags) {
    const amount = parseAmount(decodeHtml(parseAttributes(tag).content ?? ""));
    if (amount != null) return amount;
  }
  return null;
}

function readTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return null;
  const text = decodeHtml(match[1]).replace(/\s+/g, " ").trim();
  return text || null;
}

function parseAttributes(tag: string) {
  const attrs: Record<string, string> = {};
  const pattern = /([:@\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  for (const match of tag.matchAll(pattern)) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? "";
  }
  return attrs;
}

export function parseAmount(raw: unknown) {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/[,\s¥￥元]/g, "");
  if (!cleaned) return null;
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : null;
}

function decodeHtml(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num: string) => String.fromCodePoint(Number(num)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
