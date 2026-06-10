"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Category, santeiTypeOf } from "@/data/kasan-master";
import { DifficultyChip, SanteiChip } from "@/components/chips";
import { decodeInputs } from "@/lib/codec";
import { evaluate, KasanResult, nextActions } from "@/lib/engine";
import { logDiagnosis, saveFeedback, saveLead } from "@/lib/track";

const yen = (n: number) => `¥${Math.round(n).toLocaleString("ja-JP")}`;

const CATEGORY_ORDER: Category[] = ["体制・届出", "薬学管理", "調剤技術", "在宅"];

const BADGE: Record<KasanResult["status"], { label: string; cls: string }> = {
  taking: { label: "算定中", cls: "bg-emerald-100 text-emerald-800" },
  ready: { label: "今すぐ取れる", cls: "bg-rose-100 text-rose-700" },
  near: { label: "あと一歩", cls: "bg-amber-100 text-amber-800" },
  unmet: { label: "要件未達", cls: "bg-slate-100 text-slate-500" },
};

function KasanCard({ item }: { item: KasanResult }) {
  const badge = BADGE[item.status];
  const isTaking = item.status === "taking";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="w-full text-sm font-bold leading-snug sm:w-auto sm:flex-1">{item.kasan.name}</h3>
        <SanteiChip type={santeiTypeOf(item.kasan)} />
        <DifficultyChip difficulty={item.kasan.difficulty} />
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
      </div>
      <p className={`mt-2 text-lg font-bold ${isTaking ? "text-emerald-700" : "text-rose-600"}`}>
        {isTaking ? "" : "+"}
        {yen(item.monthlyYen)}
        <span className="text-xs font-normal text-slate-500"> /月{isTaking ? "(算定中の概算)" : "の機会"}</span>
      </p>
      {item.variantName && (
        <p className={`mt-1 text-xs font-medium ${isTaking ? "text-emerald-700" : "text-rose-600"}`}>
          {isTaking ? "算定中の区分" : "いま要件を満たしている区分"}: {item.variantName}
        </p>
      )}
      {item.targetVariantName && (
        <p className="mt-1 text-xs font-medium text-slate-500">いちばん近い目標: {item.targetVariantName}</p>
      )}
      {item.status === "ready" && (
        <p className="mt-2 rounded-lg bg-rose-50 p-3 text-xs leading-relaxed text-rose-700">
          入力値では要件を満たしています。未算定であれば、届出・算定運用の開始だけで取れる純粋な取りこぼしです。
        </p>
      )}
      {item.complianceWarning && (
        <div className="mt-2 rounded-lg bg-amber-50 p-3">
          <p className="text-xs font-bold text-amber-800">
            算定中ですが、入力値では以下を満たしていません。施設基準の維持要件を確認してください。
          </p>
          <ul className="mt-1 space-y-0.5">
            {item.missing.map((m) => (
              <li key={m.requirementId} className="text-xs text-amber-700">
                ・{m.text}
              </li>
            ))}
          </ul>
        </div>
      )}
      {item.upgrade && (
        <div className={`mt-3 rounded-lg p-3 ${item.upgrade.missing.length === 0 ? "bg-rose-50" : "bg-amber-50"}`}>
          <p
            className={`text-xs font-bold ${item.upgrade.missing.length === 0 ? "text-rose-700" : "text-amber-800"}`}
          >
            {item.upgrade.variantName}に上がると +{yen(item.upgrade.extraYen)}/月
          </p>
          {item.upgrade.missing.length === 0 ? (
            <p className="mt-1 text-xs text-rose-600">要件は満たしています。届出区分の見直しだけで上がれます。</p>
          ) : (
            <ul className="mt-1 space-y-0.5">
              {item.upgrade.missing.map((m) => (
                <li key={m.requirementId} className="text-xs text-amber-700">
                  不足: {m.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {!isTaking && item.missing.length > 0 && (
        <ul className="mt-3 space-y-1">
          {item.missing.map((m) => (
            <li key={m.requirementId} className="text-xs font-medium text-amber-700">
              不足: {m.text}
            </li>
          ))}
        </ul>
      )}
      {!isTaking && item.missing.length > 0 && (
        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">{item.kasan.advice}</p>
      )}
      <p className="mt-3 text-xs text-slate-400">
        計算式: {item.formula}({item.kasan.pointsNote})
        <a
          href={item.kasan.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2 underline underline-offset-2"
        >
          根拠資料
        </a>
      </p>
    </div>
  );
}

function LeadForm({ diagnosisId }: { diagnosisId: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [wantsInterview, setWantsInterview] = useState(false);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!email.includes("@")) return;
    setSending(true);
    await saveLead(email, wantsInterview, diagnosisId);
    router.push("/touroku-kanryo");
  };

  return (
    <div className="rounded-xl border-2 border-emerald-600 bg-white p-5">
      <h2 className="text-sm font-bold">改定・疑義解釈の更新をメールで受け取る</h2>
      <p className="mt-1 text-xs text-slate-500">
        診断ロジックの更新(疑義解釈の反映など)のお知らせのほか、トレーシングレポート作成支援など
        「算定タスクを手助けするツール」も準備中です。いつでも解除できます。
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          inputMode="email"
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-3 text-sm"
        />
        <button
          type="button"
          onClick={submit}
          disabled={sending || !email.includes("@")}
          className="rounded-lg bg-emerald-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-40"
        >
          登録する
        </button>
      </div>
      <label className="mt-3 flex items-start gap-2 text-xs text-slate-600">
        <input
          type="checkbox"
          checked={wantsInterview}
          onChange={(e) => setWantsInterview(e.target.checked)}
          className="mt-0.5"
        />
        改善のためのヒアリング(15分程度)に協力してもよい
      </label>
    </div>
  );
}

function FeedbackForm({ diagnosisId }: { diagnosisId: string | null }) {
  const [believable, setBelievable] = useState(0);
  const [wouldPay, setWouldPay] = useState("");
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);

  const submit = async () => {
    await saveFeedback(believable, wouldPay, comment, diagnosisId);
    setDone(true);
  };

  if (done) {
    return (
      <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
        フィードバックありがとうございます。改良の参考にします。
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-bold">30秒フィードバック</h2>
      <p className="mt-3 text-xs text-slate-600">この金額、納得感はありますか?(1=怪しい 〜 5=納得)</p>
      <div className="mt-2 flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setBelievable(n)}
            className={
              believable === n
                ? "h-10 w-10 rounded-full bg-emerald-600 text-sm font-bold text-white"
                : "h-10 w-10 rounded-full border border-slate-300 bg-white text-sm text-slate-700"
            }
          >
            {n}
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-600">月5,000円の「要件の維持管理版」に、何があれば払いますか?</p>
      <textarea
        value={wouldPay}
        onChange={(e) => setWouldPay(e.target.value)}
        rows={2}
        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        placeholder="例: 実績のカウントを自動でやってくれるなら"
      />
      <p className="mt-3 text-xs text-slate-600">その他、気づいたこと(入力で詰まった場所など)</p>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <button
        type="button"
        onClick={submit}
        disabled={believable === 0}
        className="mt-3 rounded-lg border border-emerald-600 px-5 py-2 text-sm font-bold text-emerald-700 disabled:opacity-40"
      >
        送信する
      </button>
    </div>
  );
}

function KekkaContent() {
  const searchParams = useSearchParams();
  const inputs = useMemo(() => decodeInputs(new URLSearchParams(searchParams.toString())), [searchParams]);
  const result = useMemo(() => evaluate(inputs), [inputs]);
  const [diagnosisId, setDiagnosisId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    logDiagnosis(inputs, result, searchParams.get("src") ?? "direct").then(setDiagnosisId);
  }, [inputs, result, searchParams]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* クリップボード非対応環境では何もしない */
    }
  };

  const actions = nextActions(result, 3);
  const order = { ready: 0, near: 1, unmet: 2, taking: 3 } as const;
  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: result.items
      .filter((i) => i.kasan.category === category)
      .sort((a, b) => order[a.status] - order[b.status]),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">診断結果</h1>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <p className="text-xs text-slate-500">算定できている概算 /月(申告ベース)</p>
          <p className="mt-1 text-xl font-bold text-emerald-700">{yen(result.gotYen)}</p>
        </div>
        <div className="rounded-xl bg-rose-50 p-4 ring-1 ring-rose-200">
          <p className="text-xs text-rose-600">今すぐ取れる取りこぼし /月</p>
          <p className="mt-1 text-xl font-bold text-rose-600">{yen(result.readyYen)}</p>
          <p className="mt-1 text-[11px] text-rose-500">要件は満たしているのに未算定の分</p>
        </div>
        <div className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
          <p className="text-xs text-amber-700">要件を整えれば取れる /月</p>
          <p className="mt-1 text-xl font-bold text-amber-700">{yen(result.buildYen)}</p>
          <p className="mt-1 text-[11px] text-amber-600">実績・体制づくりが必要な分</p>
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 text-xs leading-relaxed text-slate-600 ring-1 ring-slate-200">
        <span className="font-bold">未算定分の内訳: </span>
        体制づくりで取れる分(受付ごとに自動) {yen(result.autoLostYen)} ・ 日々の算定タスクで取れる分{" "}
        {yen(result.actionLostYen)}
        {result.upgradeYen > 0 && <> ・ 区分アップの上積み {yen(result.upgradeYen)}</>}
      </div>

      {actions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-slate-500">これをすれば取れる(インパクト順)</h2>
          {actions.map((a, i) => (
            <div
              key={a.title}
              className={`rounded-xl border-2 p-4 ${a.readyToTake ? "border-rose-300 bg-rose-50" : "border-emerald-200 bg-white"}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="min-w-0 flex-1 basis-40 text-sm font-bold leading-snug">{a.title}</h3>
                <SanteiChip type={a.santeiType} />
                <span className="text-sm font-bold text-emerald-700">+{yen(a.yen)}/月</span>
              </div>
              <ul className="mt-2 space-y-0.5 pl-8">
                {a.actions.map((m) => (
                  <li key={m.requirementId} className="text-xs text-slate-600">
                    ・{m.text}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      <p className="text-xs leading-relaxed text-slate-500">
        ※ 入力いただいた集計値と公開資料に基づく概算であり、算定可否を保証するものではありません。実際の算定は
        施設基準の詳細と地方厚生局への確認に基づいて判断してください。
        <Link href="/legal" className="ml-1 underline underline-offset-2">
          免責事項
        </Link>
      </p>

      {grouped.map((g) => (
        <section key={g.category} className="space-y-4">
          <h2 className="text-sm font-bold text-slate-500">{g.category}</h2>
          {g.items.map((item) => (
            <KasanCard key={item.kasan.id} item={item} />
          ))}
        </section>
      ))}

      <Link
        href="/ichiran"
        className="block rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 hover:border-emerald-400"
      >
        <span className="font-bold">参考: 簡易診断の対象外の加算一覧 →</span>
        <span className="mt-1 block text-xs text-slate-500">
          在宅系・無菌製剤・服用薬剤調整支援料など、実績・設備のハードルが高い13項目はこちら。
        </span>
      </Link>

      <LeadForm diagnosisId={diagnosisId} />

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={copyLink}
          className="flex-1 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700"
        >
          {copied ? "コピーしました" : "この結果のリンクをコピー(個人情報は含まれません)"}
        </button>
        <Link
          href="/shindan"
          className="flex-1 rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-medium text-slate-700"
        >
          数字を変えてやり直す
        </Link>
      </div>

      <FeedbackForm diagnosisId={diagnosisId} />
    </div>
  );
}

export default function KekkaPage() {
  return (
    <Suspense>
      <KekkaContent />
    </Suspense>
  );
}
