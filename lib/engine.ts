import {
  DiagnosisInputs,
  JISSEKI_ITEMS,
  JissekiId,
  Kasan,
  KASAN_MASTER,
  KasanVariant,
  Requirement,
  santeiTypeOf,
} from "@/data/kasan-master";

/**
 * 地域支援の実績①〜⑨のうち達成している項目。
 * ⑥在宅・⑦服薬情報等提供は数値入力から自動判定する。
 * ①〜⑧は「処方箋1万枚あたりの年間回数」基準なので、自店の年間処方箋枚数で必要回数を正規化する。
 */
export function achievedJisseki(inputs: DiagnosisInputs): Set<JissekiId> {
  const set = new Set<JissekiId>(inputs.jisseki.filter((id) => !JISSEKI_ITEMS.find((i) => i.id === id)?.derived));
  const factor = Math.max((inputs.rx * 12) / 10000, 0.01);
  if (inputs.zaitaku >= Math.ceil(24 * factor)) set.add("j6");
  const traceBase = inputs.kihon1 ? 30 : 60;
  if (inputs.trace >= Math.ceil(traceBase * factor)) set.add("j7");
  return set;
}

function jissekiLabel(id: JissekiId): string {
  return JISSEKI_ITEMS.find((i) => i.id === id)?.label ?? id;
}

/**
 * taking = 算定中(自己申告) / ready = 要件は満たすが未算定(今すぐ取れる取りこぼし)
 * near = 不足1項目 / unmet = 不足2項目以上
 */
export type KasanStatus = "taking" | "ready" | "near" | "unmet";

export type MissingItem = {
  requirementId: string;
  /** 結果画面にそのまま出す不足の説明(例: 在宅実績 あと14件/年) */
  text: string;
  /** 不足の重み(目標区分の選定に使う)。実績カウント要件は「あと何項目か」が入る。省略時1 */
  weight?: number;
};

function missingCost(missing: MissingItem[]): number {
  return missing.reduce((sum, m) => sum + (m.weight ?? 1), 0);
}

export type Upgrade = {
  /** 区分アップの目標(例: 区分2) */
  variantName: string;
  missing: MissingItem[];
  /** 区分アップで上積みされる月額(円) */
  extraYen: number;
};

export type KasanResult = {
  kasan: Kasan;
  status: KasanStatus;
  missing: MissingItem[];
  /** taking/ready のとき、対象の区分名(区分がある加算のみ) */
  variantName?: string;
  /** near/unmet のとき、最も近い目標の区分名(区分がある加算のみ) */
  targetVariantName?: string;
  /** より高い区分への上積み提案(taking/ready でさらに上が狙えるとき) */
  upgrade?: Upgrade;
  /** 算定中なのに入力値では要件を満たしていないとき true(施設基準の維持要件の確認を促す) */
  complianceWarning?: boolean;
  /** この加算の月間概算(円)。taking なら算定中の額、それ以外は取りこぼし額 */
  monthlyYen: number;
  /** 計算根拠の表示用文字列(例: 32点 × 10円 × 1,500枚) */
  formula: string;
};

export type DiagnosisResult = {
  items: KasanResult[];
  /** 算定できている概算 円/月(自己申告ベース) */
  gotYen: number;
  /** 今すぐ取れる取りこぼし 円/月(要件は満たすのに未算定) */
  readyYen: number;
  /** 要件を整えれば取れる 円/月(near + unmet) */
  buildYen: number;
  /** 区分アップで狙える上積み 円/月(別枠) */
  upgradeYen: number;
  /** 未算定分(ready+build)のうち、体制づくりで受付ごとに自動算定になる分 */
  autoLostYen: number;
  /** 未算定分(ready+build)のうち、日々の行為(タスク)で算定する分 */
  actionLostYen: number;
};

const YEN_PER_POINT = 10;

function checkRequirement(req: Requirement, inputs: DiagnosisInputs): MissingItem | null {
  if (req.type === "boolean") {
    const expected = req.expected ?? true;
    return inputs[req.field] === expected ? null : { requirementId: req.id, text: req.label };
  }
  if (req.type === "jisseki") {
    const achieved = achievedJisseki(inputs);
    const parts: string[] = [];
    const mustMisses = (req.mustInclude ?? []).filter((must) => !achieved.has(must));
    for (const must of mustMisses) parts.push(`必須実績: ${jissekiLabel(must)}`);
    const shortfall = req.min - achieved.size;
    if (shortfall > 0) parts.push(`実績項目 あと${shortfall}項目(9項目中${achieved.size}項目達成)`);
    if (parts.length === 0) return null;
    // 必須項目を埋めれば項目数も同時に増えるので、努力量は両者の大きい方
    const weight = Math.max(mustMisses.length, shortfall, 1);
    return { requirementId: req.id, text: parts.join(" / "), weight };
  }
  const value = inputs[req.field];
  if (value >= req.min) return null;
  const remaining = req.min - value;
  return { requirementId: req.id, text: `${req.label} あと${remaining}${req.unit}` };
}

function checkAll(requirements: Requirement[], inputs: DiagnosisInputs): MissingItem[] {
  return requirements
    .map((req) => checkRequirement(req, inputs))
    .filter((m): m is MissingItem => m !== null);
}

function monthlyYenOf(kasan: Kasan, points: number, inputs: DiagnosisInputs): { yen: number; formula: string } {
  const fmt = (n: number) => Math.round(n).toLocaleString("ja-JP");
  switch (kasan.per) {
    case "receipt":
      return {
        yen: points * YEN_PER_POINT * inputs.rx,
        formula: `${points}点 × ${YEN_PER_POINT}円 × ${fmt(inputs.rx)}枚/月`,
      };
    case "patient": {
      const cycle = kasan.cycleMonths ?? 1;
      return {
        yen: Math.round((points * YEN_PER_POINT * inputs.kakaritsuke) / cycle),
        formula:
          cycle === 1
            ? `${points}点 × ${YEN_PER_POINT}円 × ${fmt(inputs.kakaritsuke)}人 × 月1回来局と仮定`
            : `${points}点 × ${YEN_PER_POINT}円 × ${fmt(inputs.kakaritsuke)}人 ÷ ${cycle}ヶ月`,
      };
    }
    case "event": {
      const events = Math.round(inputs.rx * (kasan.eventRate ?? 0));
      return {
        yen: points * YEN_PER_POINT * events,
        formula: `${points}点 × ${YEN_PER_POINT}円 × ${fmt(events)}回/月(受付の${Math.round((kasan.eventRate ?? 0) * 100)}%と仮定)`,
      };
    }
  }
}

type CheckedVariant = {
  variant: KasanVariant;
  missing: MissingItem[];
  gateBlocked: boolean;
};

function checkVariants(variants: KasanVariant[], inputs: DiagnosisInputs): CheckedVariant[] {
  return variants.map((v) => ({
    variant: v,
    missing: checkAll(v.requirements, inputs),
    // 前提条件(gate)を満たさない区分は、行動では到達できないので目標候補にしない
    gateBlocked: v.requirements.some(
      (req) => req.type === "boolean" && req.gate && checkRequirement(req, inputs) !== null,
    ),
  }));
}

function upgradeFrom(
  kasan: Kasan,
  checked: CheckedVariant[],
  currentPoints: number,
  currentYen: number,
  inputs: DiagnosisInputs,
): Upgrade | undefined {
  // 不足ゼロの上位区分(=届出変更だけで上がれる)も候補に含める
  const candidates = checked
    .filter((c) => !c.gateBlocked && c.variant.points > currentPoints)
    .sort((a, b) => missingCost(a.missing) - missingCost(b.missing) || b.variant.points - a.variant.points);
  const target = candidates[0];
  if (!target) return undefined;
  const targetYen = monthlyYenOf(kasan, target.variant.points, inputs).yen;
  return { variantName: target.variant.name, missing: target.missing, extraYen: targetYen - currentYen };
}

function evaluateVariants(kasan: Kasan, variants: KasanVariant[], inputs: DiagnosisInputs): KasanResult {
  const checked = checkVariants(variants, inputs);

  // 算定中の区分が申告されている場合(地域支援のみ chiikiKubun を使う)
  const takingVariant =
    kasan.id === "chiiki-shien" && inputs.chiikiKubun !== "none"
      ? checked.find((c) => c.variant.id === inputs.chiikiKubun)
      : undefined;

  if (takingVariant) {
    const { yen, formula } = monthlyYenOf(kasan, takingVariant.variant.points, inputs);
    return {
      kasan,
      status: "taking",
      missing: takingVariant.missing,
      variantName: takingVariant.variant.name,
      complianceWarning: takingVariant.missing.length > 0,
      upgrade: upgradeFrom(kasan, checked, takingVariant.variant.points, yen, inputs),
      monthlyYen: yen,
      formula,
    };
  }

  // 未算定: 要件を満たす最良の区分があれば「今すぐ取れる」
  const metOnes = checked.filter((c) => c.missing.length === 0);
  const best = metOnes.length > 0 ? metOnes.reduce((a, b) => (b.variant.points > a.variant.points ? b : a)) : null;

  if (best) {
    const { yen, formula } = monthlyYenOf(kasan, best.variant.points, inputs);
    return {
      kasan,
      status: "ready",
      missing: [],
      variantName: best.variant.name,
      upgrade: upgradeFrom(kasan, checked, best.variant.points, yen, inputs),
      monthlyYen: yen,
      formula,
    };
  }

  // どの区分も未達: 到達可能な区分のうち不足が最少のものを目標にする
  const reachable = checked.filter((c) => !c.gateBlocked);
  const fallback = (reachable.length > 0 ? reachable : checked).sort(
    (a, b) => missingCost(a.missing) - missingCost(b.missing) || b.variant.points - a.variant.points,
  )[0];
  const { yen, formula } = monthlyYenOf(kasan, fallback.variant.points, inputs);
  return {
    kasan,
    status: fallback.missing.length === 1 ? "near" : "unmet",
    missing: fallback.missing,
    targetVariantName: fallback.variant.name,
    monthlyYen: yen,
    formula,
  };
}

export function evaluateKasan(kasan: Kasan, inputs: DiagnosisInputs): KasanResult {
  if (kasan.variants && kasan.variants.length > 0) {
    return evaluateVariants(kasan, kasan.variants, inputs);
  }
  const missing = checkAll(kasan.requirements, inputs);
  const { yen, formula } = monthlyYenOf(kasan, kasan.points, inputs);

  if (inputs.taking.includes(kasan.id)) {
    return {
      kasan,
      status: "taking",
      missing,
      complianceWarning: missing.length > 0,
      monthlyYen: yen,
      formula,
    };
  }
  const status: KasanStatus = missing.length === 0 ? "ready" : missing.length === 1 ? "near" : "unmet";
  return { kasan, status, missing, monthlyYen: yen, formula };
}

export function evaluate(inputs: DiagnosisInputs, master: Kasan[] = KASAN_MASTER): DiagnosisResult {
  const items = master.map((kasan) => evaluateKasan(kasan, inputs));
  let gotYen = 0;
  let readyYen = 0;
  let buildYen = 0;
  let upgradeYen = 0;
  let autoLostYen = 0;
  let actionLostYen = 0;
  for (const item of items) {
    upgradeYen += item.upgrade?.extraYen ?? 0;
    if (item.status === "taking") {
      gotYen += item.monthlyYen;
      continue;
    }
    if (item.status === "ready") readyYen += item.monthlyYen;
    else buildYen += item.monthlyYen;
    if (santeiTypeOf(item.kasan) === "auto") autoLostYen += item.monthlyYen;
    else actionLostYen += item.monthlyYen;
  }
  return { items, gotYen, readyYen, buildYen, upgradeYen, autoLostYen, actionLostYen };
}

export type NextAction = {
  title: string;
  yen: number;
  actions: MissingItem[];
  santeiType: "auto" | "action";
  /** ready 由来(要件は満たしている。届出・算定開始のみ) */
  readyToTake: boolean;
};

/** 「これをすれば取れる」の上位候補。すぐ取れるもの・要件不足・区分アップを金額の大きい順に返す */
export function nextActions(result: DiagnosisResult, limit = 3): NextAction[] {
  const candidates: NextAction[] = [];
  for (const item of result.items) {
    const santeiType = santeiTypeOf(item.kasan);
    if (item.status === "ready") {
      candidates.push({
        title: item.variantName ? `${item.kasan.name}(${item.variantName})` : item.kasan.name,
        yen: item.monthlyYen,
        actions: [{ requirementId: "ready", text: "要件は満たしています。届出・算定運用の開始のみ" }],
        santeiType,
        readyToTake: true,
      });
    } else if (item.status === "near" || item.status === "unmet") {
      candidates.push({
        title: item.targetVariantName ? `${item.kasan.name}(${item.targetVariantName})` : item.kasan.name,
        yen: item.monthlyYen,
        actions: item.missing,
        santeiType,
        readyToTake: false,
      });
    }
    if (item.upgrade && (item.status === "taking" || item.status === "ready")) {
      const readyToTake = item.upgrade.missing.length === 0;
      candidates.push({
        title: `${item.kasan.name}を${item.upgrade.variantName}へ`,
        yen: item.upgrade.extraYen,
        actions: readyToTake
          ? [{ requirementId: "ready", text: "要件は満たしています。届出区分の見直しのみ" }]
          : item.upgrade.missing,
        santeiType,
        readyToTake,
      });
    }
  }
  return candidates.sort((a, b) => b.yen - a.yen).slice(0, limit);
}
