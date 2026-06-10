import Link from "next/link";

const points = [
  {
    title: "2026年度改定に対応",
    body: "地域支援・医薬品供給対応体制加算、調剤時残薬調整加算、ベースアップ評価料など、今回の改定で動いた項目を中心に診断します。",
  },
  {
    title: "入力は月次の集計値だけ",
    body: "処方箋枚数や在宅実績などの集計値のみ。患者さんの情報は一切入力しません。",
  },
  {
    title: "2分で概算がわかる",
    body: "算定できている加算・あと一歩の加算・取りこぼし額の概算を、計算根拠つきで表示します。",
  },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="space-y-4 pt-4">
        <h1 className="text-2xl font-bold leading-snug sm:text-3xl">
          あなたの薬局、
          <br />
          加算を取りこぼしていませんか?
        </h1>
        <p className="text-sm leading-relaxed text-slate-600">
          2026年度(令和8年度)調剤報酬改定で、加算の構成は大きく変わりました。月次の数字を入れるだけで、
          いま算定できる加算と「あと一歩」の加算、機会損失の概算を表示します。無料・登録不要です。
        </p>
        <Link
          href="/shindan"
          className="block w-full rounded-xl bg-emerald-600 px-6 py-4 text-center text-base font-bold text-white hover:bg-emerald-700 sm:w-auto sm:inline-block"
        >
          無料で診断する(約2分)
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {points.map((p) => (
          <div key={p.title} className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-bold text-emerald-700">{p.title}</h2>
            <p className="text-xs leading-relaxed text-slate-600">{p.body}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-2 text-sm font-bold">運営者について</h2>
        <p className="text-xs leading-relaxed text-slate-600">
          薬局業界出身の野呂伊吹が、日本薬剤師会・厚生労働省の一次資料をもとに作成しています。
          診断ロジックの根拠資料は結果画面からすべて確認できます。
        </p>
      </section>
    </div>
  );
}
