import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/session";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  const next = safeNextPath((await searchParams).next);
  if (user) redirect(next);

  return (
    <main className="mx-auto flex max-w-md px-5 py-16">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-serif text-3xl">注册</CardTitle>
          <CardDescription>邮箱和密码就够了。降价了，才写信给你。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <AuthForm mode="register" next={next} />
          <p className="text-sm text-muted-foreground">
            已有账号？ <Link className="text-primary underline-offset-4 hover:underline" href={`/login?next=${encodeURIComponent(next)}`}>登录</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
