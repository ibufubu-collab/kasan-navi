import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "加算ナビ(仮) | 薬局の加算取りこぼし診断",
  description:
    "月次の集計値を入力するだけで、2026年度調剤報酬改定で算定できる加算・取りこぼしている加算と機会損失額の概算を表示します。患者情報は一切入力不要。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-base font-bold text-emerald-700">
              加算ナビ<span className="text-xs font-normal text-slate-400">(仮)</span>
            </Link>
            <Link href="/shindan" className="text-sm font-medium text-emerald-700 underline underline-offset-4">
              診断する
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-2xl flex-wrap gap-x-6 gap-y-1 px-4 py-4 text-xs text-slate-500">
            <Link href="/ichiran" className="underline underline-offset-2">
              対象外の加算一覧
            </Link>
            <Link href="/legal" className="underline underline-offset-2">
              免責事項・運営者情報
            </Link>
            <span>本サイトは制度情報の提供を目的とし、算定可否を保証するものではありません。</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
