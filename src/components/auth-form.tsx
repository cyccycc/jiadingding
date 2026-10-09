"use client";

import { useActionState } from "react";
import { loginAction, registerAction, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: AuthState = {};

export function AuthForm({ mode, next }: { mode: "login" | "register"; next: string }) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      <div className="grid gap-2">
        <Label htmlFor="email">邮箱</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">密码</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={8}
          placeholder="至少 8 位"
        />
      </div>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "请稍等…" : mode === "login" ? "登录" : "注册并开始"}
      </Button>
    </form>
  );
}
