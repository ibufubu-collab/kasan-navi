import Link from "next/link";

export default function TourokuKanryoPage() {
  return (
    <div className="space-y-6 pt-8 text-center">
      <h1 className="text-xl font-bold">登録ありがとうございます</h1>
      <p className="text-sm leading-relaxed text-slate-600">
        疑義解釈の反映など、診断ロジックの更新があったときにメールでお知らせします。
        <br />
        ヒアリングに協力可とされた方には、後日こちらからご連絡することがあります。
      </p>
      <Link href="/" className="inline-block rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-medium">
        トップへ戻る
      </Link>
    </div>
  );
}
