import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideNotification, isRuleHit } from "./rules";

const base = {
  ruleType: "target",
  targetPrice: 600,
  dropPercent: null,
  joinPrice: 699,
  lastNotifiedPrice: null as number | null,
  salePrice: 699,
};

describe("价格规则", () => {
  it("目标价高于现价时不触发", () => {
    const decision = decideNotification({ ...base, salePrice: 699 });
    assert.equal(decision.notify, false);
    assert.equal(decision.reason, "rule_not_met");
  });

  it("现价小于等于目标价时第一次发信", () => {
    const decision = decideNotification({ ...base, salePrice: 549 });
    assert.equal(decision.notify, true);
    assert.equal(decision.reason, "first_hit");
    assert.equal(isRuleHit({ ...base, salePrice: 600 }), true);
  });

  it("同一价格不重复发信", () => {
    const decision = decideNotification({ ...base, salePrice: 549, lastNotifiedPrice: 549 });
    assert.equal(decision.notify, false);
    assert.equal(decision.reason, "duplicate");
  });

  it("再降至少 0.5 元才再次发信", () => {
    const enough = decideNotification({ ...base, salePrice: 548.5, lastNotifiedPrice: 549 });
    const short = decideNotification({ ...base, salePrice: 548.51, lastNotifiedPrice: 549 });
    assert.equal(enough.notify, true);
    assert.equal(enough.reason, "further_drop");
    assert.equal(short.notify, false);
    assert.equal(short.reason, "duplicate");
  });

  it("按加入价计算降幅百分比", () => {
    const miss = decideNotification({
      ...base,
      ruleType: "percent",
      targetPrice: null,
      dropPercent: 10,
      joinPrice: 699,
      salePrice: 650,
    });
    const hit = decideNotification({
      ...base,
      ruleType: "percent",
      targetPrice: null,
      dropPercent: 10,
      joinPrice: 699,
      salePrice: 549,
    });
    const exact = decideNotification({
      ...base,
      ruleType: "percent",
      targetPrice: null,
      dropPercent: 10,
      joinPrice: 100,
      salePrice: 90,
    });
    assert.equal(miss.reason, "rule_not_met");
    assert.equal(hit.notify, true);
    assert.equal(exact.notify, true);
  });

  it("价格回升后不再发信，直到再次降够 0.5 元", () => {
    const risen = decideNotification({ ...base, salePrice: 560, lastNotifiedPrice: 549 });
    const again = decideNotification({ ...base, salePrice: 548.4, lastNotifiedPrice: 549 });
    assert.equal(risen.notify, false);
    assert.equal(again.notify, true);
  });
});
