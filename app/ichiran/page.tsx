import type { Metadata } from "next";
import Link from "next/link";
import { Category, KASAN_CATALOG } from "@/data/kasan-master";
import { DifficultyChip } from "@/components/chips";

export const metadata: Metadata = {
  title: "簡易診断の対象外の加算一覧 | 加算ナビ(仮)",
  description:
    "在宅・無菌製剤など、実績や設備のハードルが高い加算、店舗の状況によって大きく変わる加算の一覧。難易度の目安と根拠資料へのリンク付き。",
};

const CATEGORY_ORDER: Category[] = ["体制・届出", "薬学管理", "調剤技術", "在宅"];

export default function IchiranPage() {
  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: KASAN_CATALOG.filter((c) => c.category === category),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">簡易診断の対象外の加算一覧</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          実績・設備のハードルが高いもの、店舗の状況によって金額が大きく変わるものは、簡易診断では金額を
          出していません。自店に関係しそうな項目があれば、根拠資料を確認のうえ検討してください。
        </p>
      </div>

      {grouped.map((g) => (
        <section key={g.category} className="space-y-3">
          <h2 className="text-sm font-bold text-slate-500">{g.category}</h2>
          {g.items.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold leading-snug">{c.name}</h3>
                <DifficultyChip difficulty={c.difficulty} />
              </div>
              <p className="mt-1 text-xs font-medium text-slate-600">{c.pointsLabel}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {c.note}
                <a
                  href={c.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 underline underline-offset-2"
                >
                  根拠資料
                </a>
              </p>
            </div>
          ))}
        </section>
      ))}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          href="/shindan"
          className="flex-1 rounded-xl bg-emerald-600 px-5 py-3 text-center text-sm font-bold text-white hover:bg-emerald-700"
        >
          取りこぼし診断をする(無料・約3分)
        </Link>
        <Link
          href="/"
          className="flex-1 rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-medium text-slate-700"
        >
          トップへ戻る
        </Link>
      </div>
    </div>
  );
}
