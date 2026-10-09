import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-border/80 bg-[#fffdf8]/90">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-wide">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-sm text-primary-foreground">¥</span>
          价盯盯
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          {user ? (
            <>
              <span className="hidden text-muted-foreground sm:inline">{user.email}</span>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard">控制台</Link>
              </Button>
              <form action={logoutAction}>
                <Button type="submit" variant="outline" size="sm">
                  退出
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">登录</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">注册</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
