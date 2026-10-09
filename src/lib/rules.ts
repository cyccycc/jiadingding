import { toCents } from "@/lib/money";

export type RuleInput = {
  ruleType: string;
  targetPrice: number | null;
  dropPercent: number | null;
  joinPrice: number | null;
  lastNotifiedPrice: number | null;
  salePrice: number;
};

export type DecisionReason = "rule_not_met" | "first_hit" | "duplicate" | "further_drop" | "invalid_rule";

export type Decision = {
  notify: boolean;
  reason: DecisionReason;
};

const FURTHER_DROP_CENTS = 50;

export function isRuleHit(input: RuleInput) {
  if (input.ruleType === "target") {
    if (input.targetPrice == null || !Number.isFinite(input.targetPrice)) return false;
    return input.salePrice <= input.targetPrice + 1e-9;
  }
  if (input.ruleType === "percent") {
    if (
      input.joinPrice == null ||
      input.joinPrice <= 0 ||
      input.dropPercent == null ||
      !Number.isFinite(input.dropPercent)
    ) {
      return false;
    }
    const dropped = ((input.joinPrice - input.salePrice) / input.joinPrice) * 100;
    return dropped + 1e-9 >= input.dropPercent;
  }
  return false;
}

export function decideNotification(input: RuleInput): Decision {
  if (input.ruleType !== "target" && input.ruleType !== "percent") {
    return { notify: false, reason: "invalid_rule" };
  }
  if (input.ruleType === "target" && input.targetPrice == null) {
    return { notify: false, reason: "invalid_rule" };
  }
  if (input.ruleType === "percent" && (input.dropPercent == null || input.joinPrice == null)) {
    return { notify: false, reason: "invalid_rule" };
  }
  if (!isRuleHit(input)) return { notify: false, reason: "rule_not_met" };
  if (input.lastNotifiedPrice == null) return { notify: true, reason: "first_hit" };
  const droppedCents = toCents(input.lastNotifiedPrice) - toCents(input.salePrice);
  if (droppedCents >= FURTHER_DROP_CENTS) return { notify: true, reason: "further_drop" };
  return { notify: false, reason: "duplicate" };
}

export function describeRule(input: {
  ruleType: string;
  targetPrice: number | null;
  dropPercent: number | null;
}) {
  if (input.ruleType === "target") {
    return `目标价 ≤ ¥${trimNumber(input.targetPrice)}`;
  }
  if (input.ruleType === "percent") {
    return `较加入价下降 ${trimNumber(input.dropPercent)}%`;
  }
  return "未知规则";
}

function trimNumber(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format(value);
}
