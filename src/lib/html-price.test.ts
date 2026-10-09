import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseHtmlPrice, parseStructuredPrice } from "./html-price";

const tote = `
<!doctype html>
<html>
  <head>
    <title>忽略这个标题</title>
    <meta property="og:price:amount" content="999" />
    <meta property="product:price:amount" content="888" />
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": "帆布托特包",
        "offers": {
          "@type": "Offer",
          "priceCurrency": "CNY",
          "price": "128.00"
        }
      }
    </script>
  </head>
  <body><span itemprop="price" content="1"></span></body>
</html>`;

describe("HTML 价格解析", () => {
  it("优先读取 JSON-LD Offer.price", () => {
    const parsed = parseHtmlPrice(tote);
    assert.equal(parsed.price, 128);
    assert.equal(parsed.title, "帆布托特包");
  });

  it("支持 @graph 和 offers 数组", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@graph": [
            {
              "@type": "Product",
              "name": "亚麻衬衫",
              "offers": [
                { "@type": "Offer", "price": 239 }
              ]
            }
          ]
        }
      </script>`;
    const parsed = parseHtmlPrice(html);
    assert.equal(parsed.title, "亚麻衬衫");
    assert.equal(parsed.price, 239);
  });

  it("没有 JSON-LD 时读取 product:price:amount", () => {
    const html = `<meta content="88.50" property="product:price:amount" /><meta property="og:price:amount" content="10" />`;
    assert.equal(parseHtmlPrice(html).price, 88.5);
  });

  it("其次读取 og:price:amount", () => {
    const html = `<meta property="og:price:amount" content="76" /><span itemprop="price" content="5"></span>`;
    assert.equal(parseHtmlPrice(html).price, 76);
  });

  it("最后读取 itemprop=price", () => {
    const html = `<span itemprop="price" content="¥549"></span>`;
    assert.equal(parseHtmlPrice(html).price, 549);
  });

  it("解析不到价格时返回 null", () => {
    assert.equal(parseHtmlPrice("<html><title>空页面</title></html>").price, null);
    assert.equal(parseHtmlPrice("<html><title>空页面</title></html>").title, "空页面");
  });

  it("Offer 没有 price 时读取 priceSpecification，并分开标价和售价", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@type": "Product",
          "name": "演示降噪耳机",
          "offers": {
            "@type": "Offer",
            "priceCurrency": "CNY",
            "priceSpecification": [
              { "@type": "UnitPriceSpecification", "price": "8999", "priceType": "https://schema.org/ListPrice" },
              { "@type": "UnitPriceSpecification", "price": "7999", "priceType": "https://schema.org/SalePrice" }
            ]
          }
        }
      </script>`;
    const parsed = parseStructuredPrice(html);
    assert.equal(parsed.price, 7999);
    assert.equal(parsed.listPrice, 8999);
    assert.equal(parsed.currency, "CNY");
  });

  it("同时有外币和人民币报价时保留人民币", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@graph": [
            { "@type": "Offer", "price": "199", "priceCurrency": "USD" },
            { "@type": "Product", "name": "演示耳机", "offers": { "@type": "Offer", "price": "1499", "priceCurrency": "CNY" } }
          ]
        }
      </script>`;
    const parsed = parseStructuredPrice(html);
    assert.equal(parsed.price, 1499);
    assert.equal(parsed.currency, "CNY");
    assert.equal(parsed.title, "演示耳机");
  });

  it("itemprop 没有 content 时读取标签文本", () => {
    assert.equal(parseHtmlPrice(`<title>杯子</title><span itemprop="price">¥239.50</span>`).price, 239.5);
  });
});
