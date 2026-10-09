const globalState = globalThis as unknown as { __jddScheduler?: boolean };

let running = false;

export function startScheduler() {
  if (globalState.__jddScheduler) return;
  globalState.__jddScheduler = true;
  const configured = Number(process.env.CHECK_INTERVAL_MS || 60_000);
  const interval = Number.isFinite(configured) && configured >= 5_000 ? configured : 60_000;
  const timer = setInterval(() => {
    void runScheduledCheck();
  }, interval);
  timer.unref?.();
  console.info(`[价盯盯] 定时检查已启动，间隔 ${interval} ms`);
}

async function runScheduledCheck() {
  if (running) return;
  running = true;
  try {
    const { checkAllEnabled } = await import("@/lib/check");
    const summary = await checkAllEnabled();
    console.info(`[价盯盯] 定时检查完成：检查 ${summary.checked} 个，发信 ${summary.notified} 个`);
  } catch (error) {
    console.error("[价盯盯] 定时检查失败", error);
  } finally {
    running = false;
  }
}
