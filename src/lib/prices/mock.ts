import type { Quote } from "@/lib/prices/types";

export const MOCK_PRODUCTS = [
  {
    url: "mock://earbuds",
    title: "云感降噪耳机",
    listPrice: 899,
    initialSale: 699,
    laterSale: 549,
    note: "第二次检查从 ¥699 降到 ¥549",
  },
  {
    url: "mock://kettle",
    title: "恒温电热水壶",
    listPrice: 299,
    initialSale: 259,
    laterSale: 219,
    note: "第二次检查从 ¥259 降到 ¥219",
  },
  {
    url: "mock://keyboard",
    title: "静音机械键盘",
    listPrice: 499,
    initialSale: 459,
    laterSale: 399,
    note: "第二次检查从 ¥459 降到 ¥399",
  },
  {
    url: "mock://lamp",
    title: "护眼台灯",
    listPrice: 189,
    initialSale: 189,
    laterSale: 189,
    note: "售价保持 ¥189，不会降价",
  },
] as const;

export type MockProduct = (typeof MOCK_PRODUCTS)[number];

export function findMockProduct(url: string) {
  return MOCK_PRODUCTS.find((product) => product.url === url) ?? null;
}

export function quoteMock(url: string, priorObservations: number): Quote {
  const product = findMockProduct(url);
  if (!product) throw new Error("未知的演示商品");
  const salePrice = priorObservations > 0 ? product.laterSale : product.initialSale;
  return {
    title: product.title,
    salePrice,
    listPrice: product.listPrice,
    currency: "CNY",
    source: "mock",
  };
}
