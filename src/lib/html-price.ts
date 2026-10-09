const OFFER_TYPES = new Set(["Offer", "AggregateOffer"]);

export type HtmlPrice = {
  title: string | null;
  price: number | null;
};

export type StructuredPrice = {
  title: string | null;
  price: number | null;
  listPrice: number | null;
  currency: string | null;
};

type OfferHit = {
  price: number;
  listPrice: number | null;
  currency: string | null;
};

export function parseHtmlPrice(html: string): HtmlPrice {
  const structured = parseStructuredPrice(html);
  return { title: structured.title, price: structured.price };
}

export function parseStructuredPrice(html: string): StructuredPrice {
  const jsonLd = readJsonLd(html);
  const title = jsonLd.title ?? readMeta(html, "og:title") ?? readTitle(html);
  if (jsonLd.offer) {
    return {
      title,
      price: jsonLd.offer.price,
      listPrice: jsonLd.offer.listPrice,
      currency: jsonLd.offer.currency,
    };
  }

  const productAmount = positiveAmount(readMeta(html, "product:price:amount"));
  if (productAmount != null) {
    const original = positiveAmount(readMeta(html, "product:original_price:amount"));
    return {
      title,
      price: productAmount,
      listPrice: original != null && original > productAmount ? original : null,
      currency: normalizeCurrency(readMeta(html, "product:price:currency")),
    };
  }

  const openGraphAmount = positiveAmount(readMeta(html, "og:price:amount"));
  if (openGraphAmount != null) {
    return {
      title,
      price: openGraphAmount,
      listPrice: null,
      currency: normalizeCurrency(readMeta(html, "og:price:currency")),
    };
  }

  const item = readItemPropPrice(html);
  if (item) return { title, price: item.price, listPrice: null, currency: item.currency };
  return { title, price: null, listPrice: null, currency: null };
}

function readJsonLd(html: string) {
  const state: { title: string | null; offers: OfferHit[] } = { title: null, offers: [] };
  const pattern = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    const parsed = parseJsonLd(match[1]);
    if (parsed != null) collectJsonLd(parsed, state, false);
  }
  return { title: state.title, offer: pickOffer(state.offers) };
}

function parseJsonLd(raw: string) {
  const text = raw.trim().replace(/^<!--/, "").replace(/-->$/, "").trim();
  try {
    return JSON.parse(text);
  } catch {
    try {
      return JSON.parse(decodeHtml(text));
    } catch {
      return null;
    }
  }
}

function collectJsonLd(node: unknown, state: { title: string | null; offers: OfferHit[] }, inOffer: boolean) {
  if (Array.isArray(node)) {
    for (const item of node) collectJsonLd(item, state, inOffer);
    return;
  }
  if (!node || typeof node !== "object") return;
  const record = node as Record<string, unknown>;
  if (record["@graph"]) collectJsonLd(record["@graph"], state, false);

  const types = jsonTypes(record["@type"]);
  if (!state.title && types.some((type) => type === "Product" || type.endsWith("Product"))) {
    if (typeof record.name === "string") state.title = decodeHtml(record.name).trim() || null;
  }

  const typedOffer = types.some((type) => OFFER_TYPES.has(type) || type.endsWith("Offer"));
  if (typedOffer || inOffer) {
    const hit = offerFromRecord(record);
    if (hit) state.offers.push(hit);
  }
  if (record.offers) collectJsonLd(record.offers, state, true);
}

function offerFromRecord(record: Record<string, unknown>): OfferHit | null {
  const spec = readPriceSpec(record.priceSpecification);
  const direct = positiveAmount(record.price) ?? positiveAmount(record.lowPrice);
  const high = positiveAmount(record.highPrice);
  const price = direct ?? spec.sale ?? spec.list ?? high;
  if (price == null) return null;
  const listCandidate = spec.list ?? high;
  const currency = direct != null
    ? normalizeCurrency(record.priceCurrency) ?? spec.currency
    : spec.currency ?? normalizeCurrency(record.priceCurrency);
  return {
    price,
    listPrice: listCandidate != null && listCandidate > price ? listCandidate : null,
    currency,
  };
}

function readPriceSpec(node: unknown) {
  const found = { sale: null as number | null, list: null as number | null, currency: null as string | null };
  walk(node);
  return found;

  function walk(value: unknown) {
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    const amount = positiveAmount(record.price);
    const currency = normalizeCurrency(record.priceCurrency);
    if (currency && !found.currency) found.currency = currency;
    if (amount == null) return;
    if (priceKind(record.priceType) === "list") {
      if (found.list == null) found.list = amount;
      return;
    }
    if (found.sale == null) found.sale = amount;
  }
}

function priceKind(value: unknown) {
  if (typeof value !== "string") return null;
  if (/ListPrice|MSRP|RegularPrice|StrikethroughPrice/i.test(value)) return "list" as const;
  if (/SalePrice/i.test(value)) return "sale" as const;
  return null;
}

function pickOffer(offers: OfferHit[]) {
  return offers.find((offer) => offer.currency == null || offer.currency === "CNY") ?? offers[0] ?? null;
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
    if (name?.toLowerCase() === key.toLowerCase() && attrs.content) return decodeHtml(attrs.content);
  }
  return null;
}

function readItemPropPrice(html: string) {
  const currency = normalizeCurrency(readMeta(html, "pricecurrency"));
  const tags = html.match(/<[a-z0-9]+\b[^>]*\bitemprop\s*=\s*["']price["'][^>]*>/gi) ?? [];
  for (const tag of tags) {
    const amount = positiveAmount(decodeHtml(parseAttributes(tag).content ?? ""));
    if (amount != null) return { price: amount, currency };
  }
  const textPattern = /<([a-z0-9]+)\b[^>]*\bitemprop\s*=\s*["']price["'][^>]*>([\s\S]*?)<\/\1>/gi;
  for (const match of html.matchAll(textPattern)) {
    const amount = positiveAmount(decodeHtml(match[2].replace(/<[^>]+>/g, " ")));
    if (amount != null) return { price: amount, currency };
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

export function positiveAmount(raw: unknown) {
  const amount = parseAmount(raw);
  if (amount == null || amount <= 0 || amount >= 100_000_000) return null;
  return Math.round(amount * 100) / 100;
}

function normalizeCurrency(raw: unknown) {
  if (typeof raw !== "string") return null;
  const value = decodeHtml(raw).trim().toUpperCase();
  if (!value) return null;
  if (value === "¥" || value === "￥" || value === "元" || value === "RMB" || value === "CNH") return "CNY";
  return value;
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
