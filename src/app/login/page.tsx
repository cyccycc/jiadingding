import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/session";

export default async function LoginPage({
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
          <CardTitle className="font-serif text-3xl">登录</CardTitle>
          <CardDescription>回到你的盯价列表。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <AuthForm mode="login" next={next} />
          <p className="text-sm text-muted-foreground">
            还没有账号？ <Link className="text-primary underline-offset-4 hover:underline" href={`/register?next=${encodeURIComponent(next)}`}>注册</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
