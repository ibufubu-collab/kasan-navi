"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  BooleanField,
  CHIIKI_KUBUN_OPTIONS,
  ChiikiKubun,
  DiagnosisInputs,
  JISSEKI_ITEMS,
  JissekiId,
  KASAN_MASTER,
  NumericField,
} from "@/data/kasan-master";
import { DEFAULT_INPUTS, encodeInputs } from "@/lib/codec";

const SURVEY_KASAN = KASAN_MASTER.filter((k) => k.id !== "chiiki-shien");

type NumericQuestion = {
  field: NumericField;
  label: string;
  unit: string;
  help: string;
  presets: number[];
  unknownValue: number;
};

type BooleanQuestion = {
  field: BooleanField;
  label: string;
  help: string;
};

const NUMERIC_QUESTIONS: NumericQuestion[] = [
  {
    field: "rx",
    label: "処方箋の受付枚数(月)",
    unit: "枚",
    help: "直近月のおおよそでOKです。",
    presets: [600, 1200, 2000, 3000],
    unknownValue: 1200,
  },
  {
    field: "zaitaku",
    label: "在宅の実績(年)",
    unit: "件",
    help: "単一建物診療患者1人(個人宅等)の在宅薬剤管理の年間実績。なければ0のまま。",
    presets: [0, 12, 24, 48],
    unknownValue: 0,
  },
  {
    field: "gePct",
    label: "後発医薬品の調剤率",
    unit: "%",
    help: "直近の数量ベース。レセコンの帳票で確認できます。",
    presets: [70, 75, 80, 85],
    unknownValue: 80,
  },
  {
    field: "trace",
    label: "服薬情報等提供(トレーシングレポート)の回数(年)",
    unit: "回",
    help: "医療機関への文書による情報提供の年間回数。",
    presets: [0, 12, 30, 60],
    unknownValue: 0,
  },
  {
    field: "kakaritsuke",
    label: "かかりつけの同意を得ている患者数",
    unit: "人",
    help: "現在有効な同意書の数。おおよそでOK。",
    presets: [0, 20, 50, 100],
    unknownValue: 0,
  },
];

const TAISEI_QUESTIONS: BooleanQuestion[] = [
  {
    field: "kihon1",
    label: "調剤基本料1の薬局ですか?",
    help: "届出している調剤基本料の区分。大手チェーンや門前集中型でなければ「はい」が多数派。地域支援系加算の区分判定に使います。",
  },
  {
    field: "kyotsu",
    label: "地域支援系の共通施設基準を概ね満たしていますか?",
    help: "医療用医薬品1200品目の備蓄、一定時間以上の開局、管理薬剤師要件(経験5年・常勤・在籍1年)、研修計画、健康相談対応など。",
  },
  {
    field: "anteikyokyu",
    label: "医薬品の安定供給体制はありますか?",
    help: "計画的な調達・在庫管理、他薬局への分譲実績、単品単価交渉など。地域支援・医薬品供給対応体制加算の基礎要件。",
  },
  {
    field: "baseup",
    label: "ベースアップ評価料は届出済みですか?",
    help: "地方厚生局への届出の有無。",
  },
  {
    field: "dx",
    label: "電子処方箋・マイナ保険証の連携体制は届出済みですか?",
    help: "電子的調剤情報連携体制整備加算の対象。オンライン資格確認・電子処方箋への対応状況。",
  },
];

const UNYOU_QUESTIONS: BooleanQuestion[] = [
  {
    field: "zanyaku",
    label: "残薬確認・調整の運用ルールはありますか?",
    help: "投薬時の残薬確認と記録の手順が店舗で決まっているか。",
  },
  {
    field: "yuugai",
    label: "疑義照会の内容を記録に残す運用はありますか?",
    help: "薬学的有害事象等防止加算の要件。照会で処方が変わった記録が残っているか。",
  },
  {
    field: "hairisk",
    label: "ハイリスク薬の薬学的管理・指導は行っていますか?",
    help: "対象薬の新規処方・用量変更時の指導と記録。",
  },
  {
    field: "mayaku",
    label: "麻薬処方箋の応需はありますか?",
    help: "応需がなければ「いいえ」でOK(対象外として小さく見積もります)。",
  },
  {
    field: "kyunyu",
    label: "吸入手技の確認・指導を行っていますか?",
    help: "喘息・COPD患者への吸入指導と記録。やっているのに算定していない薬局が多い項目。",
  },
  {
    field: "followup",
    label: "かかりつけ患者への服薬期間中フォローを行っていますか?",
    help: "電話・SMS等でのフォローと記録。同意患者がいない場合は「いいえ」でOK。",
  },
];

function chipClass(selected: boolean): string {
  return selected
    ? "rounded-full border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
    : "rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:border-emerald-400";
}

function BoolQuestionCard({
  q,
  num,
  value,
  isUnknown,
  onSet,
}: {
  q: BooleanQuestion;
  num: number;
  value: boolean;
  isUnknown: boolean;
  onSet: (value: boolean, unknown?: boolean) => void;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-bold">
        <span className="mr-2 text-emerald-600">Q{num}</span>
        {q.label}
      </h3>
      <p className="mt-1 text-xs text-slate-500">{q.help}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => onSet(true)} className={chipClass(value && !isUnknown)}>
          はい
        </button>
        <button type="button" onClick={() => onSet(false)} className={chipClass(!value && !isUnknown)}>
          いいえ
        </button>
        <button type="button" onClick={() => onSet(false, true)} className={chipClass(isUnknown)}>
          わからない
        </button>
      </div>
      {isUnknown && <p className="mt-2 text-xs text-amber-600">「未対応」として控えめに計算します。</p>}
    </section>
  );
}

function ShindanForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inputs, setInputs] = useState<DiagnosisInputs>(DEFAULT_INPUTS);
  const [unknown, setUnknown] = useState<Record<string, boolean>>({});

  const setNumeric = (field: NumericField, value: number) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
    setUnknown((prev) => ({ ...prev, [field]: false }));
  };

  const setUnknownNumeric = (q: NumericQuestion) => {
    setInputs((prev) => ({ ...prev, [q.field]: q.unknownValue }));
    setUnknown((prev) => ({ ...prev, [q.field]: true }));
  };

  const setBoolean = (field: BooleanField, value: boolean, isUnknown = false) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
    setUnknown((prev) => ({ ...prev, [field]: isUnknown }));
  };

  const toggleJisseki = (id: JissekiId) => {
    setInputs((prev) => ({
      ...prev,
      jisseki: prev.jisseki.includes(id) ? prev.jisseki.filter((j) => j !== id) : [...prev.jisseki, id],
    }));
  };

  const toggleTaking = (id: string) => {
    setInputs((prev) => ({
      ...prev,
      taking: prev.taking.includes(id) ? prev.taking.filter((t) => t !== id) : [...prev.taking, id],
    }));
  };

  const submit = () => {
    const src = searchParams.get("src") ?? "direct";
    router.push(`/shindan/kekka?${encodeInputs(inputs)}&src=${encodeURIComponent(src)}`);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">加算取りこぼし診断</h1>
        <p className="mt-2 text-sm text-slate-600">
          約3分。だいたいの数字でOKです。「わからない」を選ぶと一般的な値で仮計算します。
        </p>
      </div>

      <h2 className="text-sm font-bold text-slate-500">1. いま算定しているものをチェック</h2>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-xs text-slate-500">
          現在算定している加算にチェックしてください。わからないものは未チェックでOK
          (取りこぼし候補として診断します)。
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {SURVEY_KASAN.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => toggleTaking(k.id)}
              className={chipClass(inputs.taking.includes(k.id))}
            >
              {k.name}
            </button>
          ))}
        </div>
        <div className="mt-4 border-t border-slate-100 pt-4">
          <label htmlFor="kubun" className="text-sm font-bold">
            地域支援・医薬品供給対応体制加算
          </label>
          <p className="mt-1 text-xs text-slate-500">算定中の区分を選んでください。</p>
          <select
            id="kubun"
            value={inputs.chiikiKubun}
            onChange={(e) => setInputs((prev) => ({ ...prev, chiikiKubun: e.target.value as ChiikiKubun }))}
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm sm:w-72"
          >
            {CHIIKI_KUBUN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <h2 className="pt-2 text-sm font-bold text-slate-500">2. 基本の数字(5問)</h2>

      {NUMERIC_QUESTIONS.map((q, i) => (
        <section key={q.field} className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold">
            <span className="mr-2 text-emerald-600">Q{i + 1}</span>
            {q.label}
          </h2>
          <p className="mt-1 text-xs text-slate-500">{q.help}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {q.presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setNumeric(q.field, p)}
                className={chipClass(inputs[q.field] === p && !unknown[q.field])}
              >
                {p.toLocaleString("ja-JP")}
                {q.unit}
              </button>
            ))}
            <button type="button" onClick={() => setUnknownNumeric(q)} className={chipClass(!!unknown[q.field])}>
              わからない
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <label htmlFor={q.field} className="text-xs text-slate-500">
              直接入力:
            </label>
            <input
              id={q.field}
              type="number"
              inputMode="numeric"
              min={0}
              value={unknown[q.field] ? "" : inputs[q.field]}
              placeholder={unknown[q.field] ? `${q.unknownValue}${q.unit}で仮計算` : undefined}
              onChange={(e) => setNumeric(q.field, Math.max(0, Number(e.target.value) || 0))}
              className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <span className="text-xs text-slate-500">{q.unit}</span>
          </div>
        </section>
      ))}

      <h2 className="pt-2 text-sm font-bold text-slate-500">3. 体制・届出(5問)</h2>

      {TAISEI_QUESTIONS.map((q, i) => (
        <BoolQuestionCard
          key={q.field}
          q={q}
          num={i + 6}
          value={inputs[q.field]}
          isUnknown={!!unknown[q.field]}
          onSet={(v, u) => setBoolean(q.field, v, u)}
        />
      ))}

      <h2 className="pt-2 text-sm font-bold text-slate-500">4. 日々の運用(6問)</h2>

      {UNYOU_QUESTIONS.map((q, i) => (
        <BoolQuestionCard
          key={q.field}
          q={q}
          num={i + 11}
          value={inputs[q.field]}
          isUnknown={!!unknown[q.field]}
          onSet={(v, u) => setBoolean(q.field, v, u)}
        />
      ))}

      <h2 className="pt-2 text-sm font-bold text-slate-500">5. 地域支援の実績チェック</h2>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-xs leading-relaxed text-slate-500">
          地域支援・医薬品供給対応体制加算の区分判定に使います。達成している実績を選んでください。
          回数の基準は<span className="font-bold">処方箋1万枚あたり・年間</span>
          (カッコ内は{inputs.kihon1 ? "調剤基本料1" : "調剤基本料1以外"}の基準値)。
          ⑥在宅と⑦服薬情報等提供は、上で入力した数字から自動判定します。
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {JISSEKI_ITEMS.filter((i) => !i.derived).map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() => toggleJisseki(i.id)}
              className={chipClass(inputs.jisseki.includes(i.id))}
            >
              {i.label}({inputs.kihon1 ? i.base1 : i.baseOther})
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={submit}
        className="w-full rounded-xl bg-emerald-600 px-6 py-4 text-base font-bold text-white hover:bg-emerald-700"
      >
        診断結果を見る
      </button>
      <p className="text-center text-xs text-slate-400">入力内容に患者さんの個人情報は含まれません。</p>
    </div>
  );
}

export default function ShindanPage() {
  return (
    <Suspense>
      <ShindanForm />
    </Suspense>
  );
}
