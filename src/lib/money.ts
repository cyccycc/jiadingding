export function formatYuan(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 100) / 100;
  const text = new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rounded);
  return `¥${text}`;
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "尚未检查";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "尚未检查";
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("month")}月${part("day")}日 ${part("hour")}:${part("minute")}`;
}

export function toCents(yuan: number) {
  return Math.round(yuan * 100);
}
