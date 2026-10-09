export type Quote = {
  title: string;
  salePrice: number;
  listPrice: number | null;
  currency: "CNY";
  source: "mock" | "html";
};
