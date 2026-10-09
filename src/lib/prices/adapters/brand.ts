import { parseStructuredPrice } from "@/lib/html-price";
import { brandPriceMissing, CURRENCY_UNSUPPORTED } from "@/lib/prices/messages";
import { assertOk, type PageLoader } from "@/lib/prices/page";
import type { Quote } from "@/lib/prices/types";

export type BrandSite = {
  id: string;
  name: string;
  hosts: readonly string[];
  example: string;
  paths: string;
};

export const BRAND_SITES: readonly BrandSite[] = [
  {
    id: "apple-cn",
    name: "Apple 中国",
    hosts: ["apple.com.cn"],
    example: "https://www.apple.com.cn/shop/buy-iphone/iphone-16",
    paths: "/shop/buy-iphone/、/shop/buy-mac/、/shop/buy-ipad/、/shop/buy-watch/、/shop/buy-airpods/、/shop/product/型号",
  },
  {
    id: "apple",
    name: "Apple",
    hosts: ["apple.com"],
    example: "https://www.apple.com/shop/buy-iphone/iphone-16",
    paths: "与中国站相同的 /shop/… 路径。标价必须是人民币，美元页面会拒绝",
  },
  {
    id: "dyson",
    name: "戴森",
    hosts: ["dyson.cn", "dyson.com.cn"],
    example: "https://www.dyson.cn/products/example",
    paths: "dyson.cn、dyson.com.cn 上的商品详情页",
  },
  {
    id: "sony",
    name: "索尼中国",
    hosts: ["sony.com.cn"],
    example: "https://www.sony.com.cn/products/example",
    paths: "sony.com.cn 上的商品详情页",
  },
  {
    id: "xiaomi",
    name: "小米",
    hosts: ["mi.com"],
    example: "https://www.mi.com/shop/buy/detail",
    paths: "mi.com 商品详情，例如 /shop/buy/detail",
  },
  {
    id: "vmall",
    name: "华为商城",
    hosts: ["vmall.com"],
    example: "https://www.vmall.com/product/example.html",
    paths: "vmall.com 商品详情页",
  },
  {
    id: "huawei",
    name: "华为",
    hosts: ["huawei.com"],
    example: "https://consumer.huawei.com/cn/phones/example/",
    paths: "huawei.com 商品页",
  },
  {
    id: "samsung",
    name: "三星中国",
    hosts: ["samsung.com.cn"],
    example: "https://www.samsung.com.cn/smartphones/example/",
    paths: "samsung.com.cn 商品详情页",
  },
];

const hostRules = BRAND_SITES.flatMap((site) => site.hosts.map((suffix) => ({ site, suffix }))).sort(
  (a, b) => b.suffix.length - a.suffix.length,
);

export function matchBrandSite(url: URL) {
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  return hostRules.find(({ suffix }) => host === suffix || host.endsWith(`.${suffix}`))?.site ?? null;
}

export async function quoteBrand(url: URL, site: BrandSite, load: PageLoader): Promise<Quote> {
  const page = await load(url.toString());
  assertOk(page);
  return quoteFromBrandHtml(page.html, site.name);
}

export function quoteFromBrandHtml(html: string, siteName: string): Quote {
  const parsed = parseStructuredPrice(html);
  if (parsed.price == null) throw new Error(brandPriceMissing(siteName));
  if (parsed.currency && parsed.currency !== "CNY") throw new Error(CURRENCY_UNSUPPORTED);
  return {
    title: parsed.title || siteName,
    salePrice: parsed.price,
    listPrice: parsed.listPrice,
    currency: "CNY",
    source: "brand",
  };
}
