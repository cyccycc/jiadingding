import { checkAllEnabled } from "@/lib/check";

export const runtime = "nodejs";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  const bearer = header?.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const query = new URL(request.url).searchParams.get("secret") ?? "";
  const provided = bearer || query;
  if (provided.length !== secret.length) return false;
  let mismatch = 0;
  for (let index = 0; index < provided.length; index += 1) {
    mismatch |= provided.charCodeAt(index) ^ secret.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return Response.json({ error: "未配置 CRON_SECRET" }, { status: 500 });
  }
  if (!authorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const summary = await checkAllEnabled();
  return Response.json(summary);
}
