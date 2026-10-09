export const BLOCKED_MESSAGE = "该页需登录或触发风控，暂无法抓取";
export const CURRENCY_UNSUPPORTED = "该页面标价不是人民币，暂不支持";
export const HTML_PRICE_MISSING = "页面里没有解析到价格";
export const JD_PRICE_MISSING = "京东页面没有公开标价，暂无法抓取";
export const JD_URL_HINT = "请使用京东商品页链接，例如 https://item.jd.com/100012043978.html";

export function brandPriceMissing(siteName: string) {
  return `「${siteName}」页面没有公开标价（JSON-LD Offer、og:price 或 itemprop="price"），暂无法读取`;
}
