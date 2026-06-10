export default function LegalPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">免責事項・運営者情報</h1>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-700">
        <h2 className="font-bold">免責事項</h2>
        <ul className="list-disc space-y-2 pl-5 text-xs">
          <li>
            本サイトは、調剤報酬に関する公開情報(日本薬剤師会・厚生労働省等の資料)に基づく
            <strong>一般的な情報提供</strong>を目的としています。個別の保険薬局における加算の算定可否を
            判断・保証・助言するものではありません。
          </li>
          <li>
            診断結果に表示される金額は、入力された集計値と一定の仮定に基づく<strong>概算</strong>です。
            実際の算定額・算定可否とは異なる場合があります。
          </li>
          <li>
            加算の算定にあたっては、必ず告示・通知等の一次資料をご確認のうえ、必要に応じて
            管轄の地方厚生(支)局にご確認ください。
          </li>
          <li>
            本サイトの利用により生じたいかなる損害についても、運営者は責任を負いません。
          </li>
          <li>
            本サイトでは患者さんの個人情報を収集しません。入力いただくのは店舗の月次集計値のみです。
            診断内容の改善のため、入力値(統計情報)を匿名で記録することがあります。
          </li>
        </ul>
      </section>

      <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-700">
        <h2 className="font-bold">運営者情報</h2>
        <p className="text-xs">
          運営者: 野呂伊吹
          <br />
          電話: 080-2500-4398
          <br />
          メール: ibufubu@gmail.com
          <br />
          薬局業界での実務経験をもとに、一次資料と突き合わせて診断ロジックを作成・更新しています。
        </p>
      </section>
    </div>
  );
}
