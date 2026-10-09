"use client";

import { useActionState, useState } from "react";
import { createWatchAction, type WatchFormState } from "@/app/actions/watches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: WatchFormState = {};

const presets: Record<string, { ruleType: "target" | "percent"; target: string; percent: string; hint: string }> = {
  "mock://earbuds": {
    ruleType: "target",
    target: "600",
    percent: "10",
    hint: "第一次检查记下 ¥699。再点「立即检查」，售价变成 ¥549，低于 ¥600 就会发信。",
  },
  "mock://kettle": {
    ruleType: "target",
    target: "240",
    percent: "10",
    hint: "第一次 ¥259，再次检查降到 ¥219。",
  },
  "mock://keyboard": {
    ruleType: "target",
    target: "430",
    percent: "10",
    hint: "第一次 ¥459，再次检查降到 ¥399。",
  },
  "mock://lamp": {
    ruleType: "target",
    target: "150",
    percent: "10",
    hint: "台灯售价始终 ¥189，低于这个目标价时不会发信。",
  },
};

export function WatchForm({ defaultUrl }: { defaultUrl: string }) {
  const preset = presets[defaultUrl];
  const [ruleType, setRuleType] = useState<"target" | "percent">(preset?.ruleType ?? "percent");
  const [state, formAction, pending] = useActionState(createWatchAction, initial);

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="url">商品链接</Label>
        <Input
          id="url"
          name="url"
          required
          defaultValue={defaultUrl}
          placeholder="mock://earbuds 或 https://..."
        />
        <p className="text-sm text-muted-foreground">
          演示商品：mock://earbuds、mock://kettle、mock://keyboard、mock://lamp。网页商品支持 JSON-LD、product:price:amount、og:price:amount、itemprop=price。
        </p>
      </div>

      <fieldset className="grid gap-3">
        <legend className="text-sm font-medium">规则</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="ruleType"
            value="target"
            checked={ruleType === "target"}
            onChange={() => setRuleType("target")}
          />
          目标价，现价小于等于它就发信
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="ruleType"
            value="percent"
            checked={ruleType === "percent"}
            onChange={() => setRuleType("percent")}
          />
          降幅，相对加入时的价格
        </label>
      </fieldset>

      {ruleType === "target" ? (
        <div className="grid gap-2">
          <Label htmlFor="targetPrice">目标价（元）</Label>
          <Input id="targetPrice" name="targetPrice" type="number" min="0.01" step="0.01" required defaultValue={preset?.target ?? ""} />
        </div>
      ) : (
        <div className="grid gap-2">
          <Label htmlFor="dropPercent">降幅（%）</Label>
          <Input id="dropPercent" name="dropPercent" type="number" min="0.1" max="99" step="0.1" required defaultValue={preset?.percent ?? "10"} />
        </div>
      )}

      {preset ? <p className="text-sm text-muted-foreground">{preset.hint}</p> : null}
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "正在读取价格…" : "开始盯价"}
      </Button>
    </form>
  );
}
