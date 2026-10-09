const messages: Record<string, string> = {
  created: "已记下加入时的价格。再检查一次，就能看到有没有降。",
  checked: "检查完成。这次没有发信。",
  notified: "到价了。信已发出；如果没配 SMTP，内容在下面，文件在 data/outbox。",
  toggled: "盯价状态已更新。",
  error: "这次检查没有成功。",
};

export function NoticeBanner({ notice, detail }: { notice?: string; detail?: string }) {
  if (!notice || !messages[notice]) return null;
  return (
    <p className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
      {messages[notice]}
      {detail ? <span className="mt-1 block text-destructive">{detail}</span> : null}
    </p>
  );
}
