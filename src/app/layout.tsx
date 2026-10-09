import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "价盯盯",
  description: "降价了，才写信给你。把商品链接交给价盯盯，到价或降够比例再发信。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="flex min-h-full flex-col antialiased">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-border/80 py-6 text-center text-sm text-muted-foreground">
          价盯盯 · 降价了，才写信给你
        </footer>
      </body>
    </html>
  );
}
