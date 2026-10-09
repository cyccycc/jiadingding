import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { decideNotification } from "./rules";
import { quoteMock } from "./prices/mock";
import { deliverNotification } from "./notify";

describe("演示商品与发件箱", () => {
  const outbox = fs.mkdtempSync(path.join(os.tmpdir(), "jdd-outbox-"));
  const previousHost = process.env.SMTP_HOST;

  after(() => {
    process.env.SMTP_HOST = previousHost;
    fs.rmSync(outbox, { recursive: true, force: true });
  });

  it("耳机从 699 降到 549，台灯不降，且同一价格只写一封信", async () => {
    process.env.SMTP_HOST = "";
    const first = quoteMock("mock://earbuds", 0);
    const second = quoteMock("mock://earbuds", 1);
    const third = quoteMock("mock://earbuds", 4);
    assert.equal(first.listPrice, 899);
    assert.equal(first.salePrice, 699);
    assert.equal(second.salePrice, 549);
    assert.equal(third.salePrice, 549);
    assert.equal(quoteMock("mock://kettle", 0).salePrice, 259);
    assert.equal(quoteMock("mock://kettle", 1).salePrice, 219);
    assert.equal(quoteMock("mock://keyboard", 0).salePrice, 459);
    assert.equal(quoteMock("mock://keyboard", 1).salePrice, 399);
    assert.equal(quoteMock("mock://lamp", 0).salePrice, 189);
    assert.equal(quoteMock("mock://lamp", 5).salePrice, quoteMock("mock://lamp", 0).salePrice);
    assert.equal(quoteMock("mock://lamp", 0).listPrice, 189);

    const watch = {
      ruleType: "target" as const,
      targetPrice: 600,
      dropPercent: null,
      joinPrice: first.salePrice,
    };
    let lastNotified: number | null = null;
    const prices = [first.salePrice, second.salePrice, third.salePrice, 548.5];
    let sent = 0;

    for (const salePrice of prices) {
      const decision = decideNotification({ ...watch, lastNotifiedPrice: lastNotified, salePrice });
      if (!decision.notify) continue;
      const delivered = await deliverNotification(
        {
          to: "reader@example.com",
          watchId: "watch_earbuds",
          title: first.title,
          url: "mock://earbuds",
          salePrice,
          listPrice: first.listPrice,
          joinPrice: first.salePrice,
        },
        { outboxDir: outbox },
      );
      assert.equal(delivered.channel, "outbox");
      assert.match(delivered.subject, /云感降噪耳机/);
      assert.match(delivered.text, /降价了，才写信给你/);
      lastNotified = salePrice;
      sent += 1;
    }

    assert.equal(sent, 2);
    const files = fs.readdirSync(outbox).filter((name) => name.endsWith(".json"));
    assert.equal(files.length, 2);
    const mails = files.map(
      (name) => JSON.parse(fs.readFileSync(path.join(outbox, name), "utf8")) as { to: string; salePrice: number },
    );
    assert.equal(mails.filter((mail) => mail.to === "reader@example.com").length, 2);
    assert.equal(mails.some((mail) => mail.salePrice === 549), true);
    assert.equal(mails.some((mail) => mail.salePrice === 548.5), true);

    const lamp = decideNotification({
      ruleType: "percent",
      targetPrice: null,
      dropPercent: 10,
      joinPrice: 189,
      lastNotifiedPrice: null,
      salePrice: quoteMock("mock://lamp", 2).salePrice,
    });
    assert.equal(lamp.notify, false);
  });
});
