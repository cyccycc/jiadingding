import { BLOCKED_MESSAGE } from "@/lib/prices/messages";

const MAX_HTML_BYTES = 1_000_000;
const UTF8 = new Set(["utf-8", "utf8", "unicode-1-1-utf-8"]);

export type LoadedPage = {
  status: number;
  finalUrl: string;
  html: string;
};

export type PageLoader = (url: string) => Promise<LoadedPage>;

export function fetchFailureMessage(error: unknown) {
  if (error instanceof Error && error.name === "TimeoutError") return "页面请求超时";
  return "页面请求失败";
}

export async function loadPage(url: string): Promise<LoadedPage> {
  let response: Response;
  try {
    response = await fetch(url, {
      redirect: "follow",
      cache: "no-store",
      credentials: "omit",
      signal: AbortSignal.timeout(12_000),
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "JiaDingDing/0.1 (price watch)",
      },
    });
  } catch (error) {
    throw new Error(fetchFailureMessage(error));
  }

  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_HTML_BYTES) throw new Error("页面过大，无法解析");
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_HTML_BYTES) throw new Error("页面过大，无法解析");

  return {
    status: response.status,
    finalUrl: response.url || url,
    html: decodePage(buffer, response.headers.get("content-type")),
  };
}

export function assertOk(page: LoadedPage) {
  if (page.status === 401 || page.status === 403 || page.status === 429) throw new Error(BLOCKED_MESSAGE);
  if (page.status < 200 || page.status >= 300) throw new Error(`页面返回 HTTP ${page.status}`);
}

export function decodePage(buffer: ArrayBuffer | Uint8Array, contentType: string | null) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const headerCharset = charsetFromHeader(contentType);
  if (headerCharset) return decodeWith(bytes, headerCharset) ?? decodeWith(bytes, "utf-8") ?? "";
  const utf8 = decodeWith(bytes, "utf-8") ?? "";
  const sniffed = charsetFromHtml(utf8);
  if (sniffed && !UTF8.has(sniffed)) return decodeWith(bytes, sniffed) ?? utf8;
  return utf8;
}

function charsetFromHeader(contentType: string | null) {
  if (!contentType) return null;
  const match = contentType.match(/charset\s*=\s*"?([a-z0-9._-]+)/i);
  return match ? match[1].toLowerCase() : null;
}

function charsetFromHtml(html: string) {
  const match = html.slice(0, 4096).match(/<meta\b[^>]*charset\s*=\s*["']?\s*([a-z0-9._-]+)/i);
  return match ? match[1].toLowerCase() : null;
}

function decodeWith(bytes: Uint8Array, charset: string) {
  try {
    return new TextDecoder(charset, { fatal: false }).decode(bytes);
  } catch {
    return null;
  }
}
