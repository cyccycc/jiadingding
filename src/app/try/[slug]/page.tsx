import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

const products: Record<string, string> = {
  earbuds: "mock://earbuds",
  kettle: "mock://kettle",
  keyboard: "mock://keyboard",
  lamp: "mock://lamp",
};

export default async function TryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = products[slug];
  if (!url) redirect("/");
  const next = `/dashboard/watches/new?url=${encodeURIComponent(url)}`;
  const user = await getCurrentUser();
  if (!user) redirect(`/register?next=${encodeURIComponent(next)}`);
  redirect(next);
}
