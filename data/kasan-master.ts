// 加算マスタ — このプロダクトの本体資産。
// 一次資料: 厚生労働省「令和8年度診療報酬改定の概要【調剤】」(令和8年3月5日版)
// https://www.mhlw.go.jp/content/12400000/001684593.pdf (以下 MHLW_GAIYO)
// 点数・要件はこの資料とAIが照合済みだが、告示・通知の正式版および疑義解釈での最終確認は運営者が行うこと。
// 改定・疑義解釈が出たらこのファイルだけを直す。
//
// 二層構造:
//   KASAN_MASTER  … 診断対象。届出・運用改善で取れる「取りやすい」加算と、旗艦の地域支援系
//   KASAN_CATALOG … 診断対象外。実績・設備要件が重いもの、金額が小さいもの(参考表示のみ)

export type ChiikiKubun = "none" | "ku1" | "ku2" | "ku3" | "ku4" | "ku5";

export const CHIIKI_KUBUN_OPTIONS: { value: ChiikiKubun; label: string }[] = [
  { value: "none", label: "算定していない / わからない" },
  { value: "ku1", label: "加算1" },
  { value: "ku2", label: "加算2" },
  { value: "ku3", label: "加算3" },
  { value: "ku4", label: "加算4" },
  { value: "ku5", label: "加算5" },
];

/** 地域支援・医薬品供給対応体制加算の実績要件①〜⑨(MHLW_GAIYO p.23) */
export type JissekiId = "j1" | "j2" | "j3" | "j4" | "j5" | "j6" | "j7" | "j8" | "j9";

export type JissekiItem = {
  id: JissekiId;
  label: string;
  /** 基本料1の基準(①〜⑧は処方箋1万枚あたり・年、⑨は薬局あたり・年) */
  base1: string;
  /** 基本料1以外の基準 */
  baseOther: string;
  /** true なら数値入力(在宅実績・服薬情報等提供)から自動判定する */
  derived?: boolean;
};

export const JISSEKI_ITEMS: JissekiItem[] = [
  { id: "j1", label: "①夜間・休日等の対応", base1: "40回", baseOther: "400回" },
  { id: "j2", label: "②麻薬の調剤", base1: "1回", baseOther: "10回" },
  { id: "j3", label: "③残薬調整・有害事象防止加算の算定", base1: "20回", baseOther: "40回" },
  { id: "j4", label: "④かかりつけ(1のイ・2のイ)の算定", base1: "20回", baseOther: "40回" },
  { id: "j5", label: "⑤外来服薬支援料1", base1: "1回", baseOther: "12回" },
  { id: "j6", label: "⑥在宅薬剤管理(単一建物1人)", base1: "24回", baseOther: "24回", derived: true },
  { id: "j7", label: "⑦服薬情報等提供", base1: "30回", baseOther: "60回", derived: true },
  { id: "j8", label: "⑧小児特定加算の算定", base1: "1回", baseOther: "1回" },
  { id: "j9", label: "⑨認定薬剤師の多職種連携会議出席", base1: "1回", baseOther: "5回" },
];

export type DiagnosisInputs = {
  /** 処方箋枚数 / 月 */
  rx: number;
  /** 在宅実績(単一建物1人) 件 / 年 */
  zaitaku: number;
  /** 後発医薬品調剤率 % */
  gePct: number;
  /** 服薬情報等提供(トレーシングレポート) 回 / 年 */
  trace: number;
  /** かかりつけ同意患者数 */
  kakaritsuke: number;
  /** 地域支援系の共通施設基準(備蓄1200品目・開局時間・管理薬剤師要件など)を概ね満たす */
  kyotsu: boolean;
  /** 医薬品の安定供給体制(計画的調達・薬局間分譲・単品単価交渉など) */
  anteikyokyu: boolean;
  /** 残薬確認・調整の運用ルールあり */
  zanyaku: boolean;
  /** ベースアップ評価料の届出済み */
  baseup: boolean;
  /** 電子処方箋・マイナ保険証(利用率30%以上)の体制整備・届出済み */
  dx: boolean;
  /** 疑義照会による処方変更時に記録を残す運用あり */
  yuugai: boolean;
  /** ハイリスク薬の薬学的管理・指導を実施 */
  hairisk: boolean;
  /** 麻薬処方箋の応需あり */
  mayaku: boolean;
  /** 吸入手技の確認・指導を実施 */
  kyunyu: boolean;
  /** かかりつけ患者への服薬期間中フォローを実施 */
  followup: boolean;
  /** 調剤基本料1の届出薬局か */
  kihon1: boolean;
  /** 地域支援の実績要件①〜⑨のうち自己申告で達成しているもの(⑥⑦は数値から自動判定) */
  jisseki: JissekiId[];
  /** 現在算定している加算のID一覧(自己申告アンケート) */
  taking: string[];
  /** 地域支援・医薬品供給対応体制加算の現在算定中の区分("none"=算定していない/わからない) */
  chiikiKubun: ChiikiKubun;
};

export type NumericField = "rx" | "zaitaku" | "gePct" | "trace" | "kakaritsuke";
export type BooleanField =
  | "kyotsu"
  | "anteikyokyu"
  | "zanyaku"
  | "baseup"
  | "dx"
  | "yuugai"
  | "hairisk"
  | "mayaku"
  | "kyunyu"
  | "followup"
  | "kihon1";

export type Category = "体制・届出" | "薬学管理" | "調剤技術" | "在宅";
export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "取りやすい",
  medium: "運用次第",
  hard: "ハードル高",
};

/** 算定タイプ。auto=体制が整えば受付ごとに自動 / action=行為(タスク)で算定 */
export function santeiTypeOf(kasan: Pick<Kasan, "per" | "santeiType">): "auto" | "action" {
  return kasan.santeiType ?? (kasan.per === "receipt" ? "auto" : "action");
}

export const SANTEI_TYPE_LABEL: Record<"auto" | "action", string> = {
  auto: "受付ごとに自動",
  action: "行為で算定",
};

export type Requirement =
  | {
      id: string;
      type: "threshold";
      field: NumericField;
      min: number;
      /** 要件名(不足表示は「{label} あと{差分}{unit}」になる) */
      label: string;
      unit: string;
    }
  | {
      id: string;
      type: "boolean";
      field: BooleanField;
      label: string;
      /** 要件を満たす値(省略時 true)。「基本料1以外」のような否定条件に使う */
      expected?: boolean;
      /** 前提条件(調剤基本料の区分など、行動で変えられないもの)。区分アップ提案の対象から除外される */
      gate?: boolean;
    }
  | {
      /** 地域支援の実績要件①〜⑨のカウント判定(達成項目数 min 以上、mustInclude は必須) */
      id: string;
      type: "jisseki";
      min: number;
      mustInclude?: JissekiId[];
      label: string;
    };

/** 同一加算内の区分(地域支援の加算1〜5など)。点数が高い順でなくてよい */
export type KasanVariant = {
  id: string;
  name: string;
  points: number;
  requirements: Requirement[];
};

export type Kasan = {
  id: string;
  name: string;
  category: Category;
  difficulty: Difficulty;
  /** 点数 */
  points: number;
  /** 算定単位: receipt=処方箋受付ごと / patient=対象患者ごと / event=発生イベントごと */
  per: "receipt" | "patient" | "event";
  /** per=event のとき、受付枚数に対する発生率の仮定値 */
  eventRate?: number;
  /** per=patient で算定周期が月1回でないとき(例: 3ヶ月に1回 → 3) */
  cycleMonths?: number;
  /**
   * 算定タイプ。auto=体制が整えば受付ごとに自動的に算定 / action=行為(タスク)を行ったときに算定。
   * 省略時は per から導出(receipt→auto、それ以外→action)
   */
  santeiType?: "auto" | "action";
  /** 区分がある加算(地域支援など)。指定時は requirements の代わりに区分ごとに判定する */
  variants?: KasanVariant[];
  /** 点数の試算に関する注記(結果画面に表示) */
  pointsNote: string;
  requirements: Requirement[];
  /** 不足時の改善アドバイス(自分で執筆・推敲する) */
  advice: string;
  /** 根拠資料へのリンク */
  sourceUrl: string;
  /** 内容を一次資料と突き合わせて確認した日付とソース */
  lastReviewed: string;
};

export type CatalogKasan = {
  id: string;
  name: string;
  category: Category;
  difficulty: Difficulty;
  pointsLabel: string;
  note: string;
  sourceUrl: string;
  lastReviewed: string;
};

const MHLW_GAIYO = "https://www.mhlw.go.jp/content/12400000/001684593.pdf";
const NICHIYAKU_PDF = "https://www.nichiyaku.or.jp/files/co/pharmacy-info/2026/20260402_01.pdf";
const NKDESK_R8 = "https://kanri.nkdesk.com/houshu/r8.php";
const REVIEWED_MHLW = "2026-06-10 AI照合(厚労省 改定の概要 R8.3.5版)・運営者の最終確認待ち";

const GE85: Requirement = { id: "ge85", type: "threshold", field: "gePct", min: 85, label: "後発品調剤率", unit: "pt" };
const ANTEI: Requirement = { id: "antei", type: "boolean", field: "anteikyokyu", label: "医薬品の安定供給体制(計画的調達・薬局間分譲・単品単価交渉等)" };
const KYOTSU: Requirement = { id: "kyotsu", type: "boolean", field: "kyotsu", label: "共通施設基準(備蓄1200品目・開局時間・管理薬剤師要件等)" };
const KIHON1: Requirement = { id: "kihon1", type: "boolean", field: "kihon1", label: "調剤基本料1の届出", gate: true };
const KIHON1_NOT: Requirement = { id: "kihon1-not", type: "boolean", field: "kihon1", expected: false, label: "調剤基本料1以外の届出", gate: true };

export const KASAN_MASTER: Kasan[] = [
  // ── 体制・届出 ─────────────────────────────
  {
    id: "chiiki-shien",
    name: "地域支援・医薬品供給対応体制加算",
    category: "体制・届出",
    difficulty: "hard",
    points: 27,
    per: "receipt",
    pointsNote:
      "加算1〜5(27/59/67/37/59点)を公式の実績要件①〜⑨のカウント方式で判定。①〜⑧は処方箋1万枚あたり・年間回数で正規化。処方箋受付1回ごとに算定。",
    requirements: [ANTEI, GE85],
    // 区分構成は厚労省「改定の概要」p.22-23 に基づく。実績①〜⑨の詳細は JISSEKI_ITEMS を参照
    variants: [
      {
        id: "ku1",
        name: "加算1",
        points: 27,
        requirements: [ANTEI, GE85],
      },
      {
        id: "ku2",
        name: "加算2",
        points: 59,
        requirements: [
          KIHON1,
          ANTEI,
          GE85,
          KYOTSU,
          { id: "jisseki3", type: "jisseki", min: 3, mustInclude: ["j4"], label: "実績要件: ④かかりつけを含む3項目以上" },
        ],
      },
      {
        id: "ku3",
        name: "加算3",
        points: 67,
        requirements: [
          KIHON1,
          ANTEI,
          GE85,
          KYOTSU,
          { id: "jisseki7", type: "jisseki", min: 7, label: "実績要件: ①〜⑨のうち7項目以上" },
        ],
      },
      {
        id: "ku4",
        name: "加算4",
        points: 37,
        requirements: [
          KIHON1_NOT,
          ANTEI,
          GE85,
          KYOTSU,
          { id: "jisseki3", type: "jisseki", min: 3, mustInclude: ["j4", "j6"], label: "実績要件: ④⑥を含む3項目以上" },
        ],
      },
      {
        id: "ku5",
        name: "加算5",
        points: 59,
        requirements: [
          KIHON1_NOT,
          ANTEI,
          GE85,
          KYOTSU,
          { id: "jisseki7", type: "jisseki", min: 7, label: "実績要件: ①〜⑨のうち7項目以上" },
        ],
      },
    ],
    advice:
      "後発品調剤体制加算は廃止され、後発85%以上はこの加算の基礎要件に統合された。実績①〜⑨は処方箋1万枚あたりの年間回数なので、処方箋枚数が多い薬局ほど必要回数も増える点に注意。月ごとの必要ペースに分解して掲示すると現場が動きやすい。R8.3.31時点で旧後発品加算を届出済みなら、後発品率要件はR9.5.31まで経過措置あり。",
    sourceUrl: MHLW_GAIYO,
    lastReviewed: REVIEWED_MHLW,
  },
  {
    id: "baseup",
    name: "調剤ベースアップ評価料",
    category: "体制・届出",
    difficulty: "easy",
    points: 4,
    per: "receipt",
    pointsNote: "処方箋受付1回につき4点(厚労省 改定の概要 p.16)。",
    requirements: [{ id: "todokede", type: "boolean", field: "baseup", label: "地方厚生局への届出" }],
    advice:
      "賃上げ実施が前提だが、届出のみで受付ごとに算定できるため未届けは純粋な取りこぼし。様式と賃金改善計画の書き方は厚生局の記載例を参照。",
    sourceUrl: MHLW_GAIYO,
    lastReviewed: REVIEWED_MHLW,
  },
  {
    id: "dx-renkei",
    name: "電子的調剤情報連携体制整備加算",
    category: "体制・届出",
    difficulty: "easy",
    points: 8,
    per: "event",
    santeiType: "auto",
    eventRate: 0.3,
    pointsNote:
      "患者1人につき月1回8点(医療DX推進体制整備加算を統合)。受付の30%が対象になると控えめに仮定して試算。",
    requirements: [
      {
        id: "dx",
        type: "boolean",
        field: "dx",
        label: "電子処方箋・重複投薬チェック体制の整備と届出(マイナ保険証利用率30%以上)",
      },
    ],
    advice:
      "施設基準にマイナ保険証利用率30%以上(算定月の3月前・件数ベース)がある。利用率が届かない場合は声かけ・レセコン掲示で底上げを。電子処方箋対応済みなら残りは届出。",
    sourceUrl: MHLW_GAIYO,
    lastReviewed: REVIEWED_MHLW,
  },
  // ── 薬学管理 ─────────────────────────────
  {
    id: "zanyaku-chousei",
    name: "調剤時残薬調整加算",
    category: "薬学管理",
    difficulty: "easy",
    points: 30,
    per: "event",
    eventRate: 0.03,
    pointsNote:
      "30点(在宅患者またはかかりつけ薬剤師が実施した場合は50点)。最も低い30点・受付の3%で発生と控えめに仮定して試算。",
    requirements: [{ id: "unyou", type: "boolean", field: "zanyaku", label: "残薬確認・調整の運用ルール化" }],
    advice:
      "2026年新設。残薬状況の聞き取りと残薬調整の実施が要件。投薬時の残薬確認を全患者ルーチンにし、記録の残し方を統一すれば算定漏れが減る。地域支援の実績③にもカウントされる。",
    sourceUrl: MHLW_GAIYO,
    lastReviewed: REVIEWED_MHLW,
  },
  {
    id: "yuugai-boushi",
    name: "薬学的有害事象等防止加算",
    category: "薬学管理",
    difficulty: "easy",
    points: 30,
    per: "event",
    eventRate: 0.02,
    pointsNote:
      "30点(在宅患者またはかかりつけ薬剤師が実施した場合は50点)。30点・服用薬剤の一元管理に基づく薬剤調整が受付の2%で発生と仮定して試算。",
    requirements: [
      { id: "unyou", type: "boolean", field: "yuugai", label: "疑義照会・薬剤調整の記録運用" },
    ],
    advice:
      "2026年新設。一元的管理に基づく薬剤調整を評価。照会記録のテンプレートに「算定チェック欄」を足すだけで漏れが減る。地域支援の実績③にもカウントされる。",
    sourceUrl: MHLW_GAIYO,
    lastReviewed: REVIEWED_MHLW,
  },
  {
    id: "kakaritsuke-followup",
    name: "かかりつけ薬剤師フォローアップ加算",
    category: "薬学管理",
    difficulty: "medium",
    points: 50,
    per: "patient",
    cycleMonths: 3,
    pointsNote:
      "同意患者1人につき3ヶ月に1回50点(厚労省 改定の概要 p.31)。全同意患者に算定できた場合の月割りで試算。対象は外来服薬支援料1・服用薬剤調整支援料・残薬調整・有害事象防止のいずれかを算定した患者。",
    requirements: [
      { id: "douisya", type: "threshold", field: "kakaritsuke", min: 1, label: "かかりつけ同意患者", unit: "人" },
      { id: "unyou", type: "boolean", field: "followup", label: "電話等による服薬期間中フォローの実施" },
    ],
    advice:
      "かかりつけ薬剤師指導料(76点)の廃止に代わる実績評価。すでにやっている電話フォローを記録に残し、対象患者(残薬調整等の算定者)に紐づけて管理すれば、そのまま算定対象になるケースが多い。",
    sourceUrl: MHLW_GAIYO,
    lastReviewed: REVIEWED_MHLW,
  },
  {
    id: "tokutei-yakuzai",
    name: "特定薬剤管理指導加算1(ハイリスク薬)",
    category: "薬学管理",
    difficulty: "easy",
    points: 10,
    per: "event",
    eventRate: 0.03,
    pointsNote: "新規処方時10点・用量変更時5点。10点・受付の3%で発生と仮定して試算。",
    requirements: [
      { id: "unyou", type: "boolean", field: "hairisk", label: "ハイリスク薬の薬学的管理・指導の実施" },
    ],
    advice:
      "対象薬の一覧をレセコンのアラートに登録し、新規・用量変更を機械的に拾う運用にすると漏れがほぼなくなる。",
    sourceUrl: NKDESK_R8,
    lastReviewed: "未確認",
  },
  {
    id: "mayaku-shidou",
    name: "麻薬管理指導加算",
    category: "薬学管理",
    difficulty: "easy",
    points: 22,
    per: "event",
    eventRate: 0.01,
    pointsNote: "麻薬調剤が受付の1%で発生すると仮定して試算。麻薬応需がない薬局は対象外。",
    requirements: [{ id: "unyou", type: "boolean", field: "mayaku", label: "麻薬処方箋の応需" }],
    advice:
      "麻薬処方箋の応需時に自動で算定候補に上がるようレセコンを設定しておく。麻薬調剤は地域支援の実績②にもカウントされる。",
    sourceUrl: NKDESK_R8,
    lastReviewed: "未確認",
  },
  {
    id: "kyunyu-shidou",
    name: "吸入薬指導加算",
    category: "薬学管理",
    difficulty: "easy",
    points: 30,
    per: "event",
    eventRate: 0.005,
    pointsNote:
      "患者1人につき6ヶ月に1回30点(従来の3ヶ月に1回から変更)。対象にインフルエンザ患者の吸入薬が追加。受付の0.5%で発生すると控えめに仮定して試算。",
    requirements: [{ id: "unyou", type: "boolean", field: "kyunyu", label: "吸入手技の確認・指導と文書での情報提供" }],
    advice:
      "文書・練習用吸入器を用いた指導と、医療機関への文書での情報提供が要件。インフルエンザ吸入薬(イナビル等)が対象に加わったため、流行期は算定機会が大きく増える。",
    sourceUrl: MHLW_GAIYO,
    lastReviewed: REVIEWED_MHLW,
  },
];

// 診断対象外(参考表示)。実績・設備のハードルが高いもの、または金額が小さいもの。
export const KASAN_CATALOG: CatalogKasan[] = [
  {
    id: "kakaritsuke-taisei",
    name: "服薬管理指導料1のイ・2のイ(かかりつけ薬剤師)",
    category: "薬学管理",
    difficulty: "medium",
    pointsLabel: "45点/59点(かかりつけ以外と同点)",
    note: "指導料自体に点数差はないが、フォローアップ加算・訪問加算・残薬調整等の50点区分、地域支援の必須実績④の入口になる戦略的な体制。薬剤師要件(認定研修・在籍6ヶ月以上など)に注意。",
    sourceUrl: MHLW_GAIYO,
    lastReviewed: REVIEWED_MHLW,
  },
  {
    id: "kakaritsuke-houmon",
    name: "かかりつけ薬剤師訪問加算",
    category: "薬学管理",
    difficulty: "medium",
    pointsLabel: "230点(6月に1回)",
    note: "患家を訪問して服薬管理・残薬確認を行い、医療機関へ情報提供した場合。2026年新設。",
    sourceUrl: MHLW_GAIYO,
    lastReviewed: REVIEWED_MHLW,
  },
  {
    id: "zaitaku-sougou",
    name: "在宅薬学総合体制加算",
    category: "在宅",
    difficulty: "hard",
    pointsLabel: "加算1: 30点 / 加算2: 100点(個人宅)・50点",
    note: "訪問実績48回/年、時間外対応、在宅研修などが要件。加算2は個人宅実績(240回以上かつ2割以上等)や薬剤師3名以上の常勤換算が必要。在宅に本格参入するなら最優先で設計する加算。",
    sourceUrl: MHLW_GAIYO,
    lastReviewed: REVIEWED_MHLW,
  },
  {
    id: "houmon-kasan",
    name: "在宅患者訪問薬剤管理指導料の各加算",
    category: "在宅",
    difficulty: "hard",
    pointsLabel: "麻薬100点・小児特定450点など",
    note: "訪問薬剤管理の実施が前提。週1回算定に緩和。医師との同時訪問(訪問薬剤管理医師同時指導料150点)や複数名訪問(300点)の評価も新設。",
    sourceUrl: MHLW_GAIYO,
    lastReviewed: REVIEWED_MHLW,
  },
  {
    id: "kinkyu-houmon",
    name: "在宅患者緊急訪問(夜間・休日・深夜)加算",
    category: "在宅",
    difficulty: "hard",
    pointsLabel: "400〜1,000点",
    note: "緊急時の訪問体制が前提。在宅を本格化した後の上積み。",
    sourceUrl: NKDESK_R8,
    lastReviewed: "未確認",
  },
  {
    id: "kyoudou-shidou",
    name: "退院時共同指導料・在宅患者緊急時等共同指導料",
    category: "在宅",
    difficulty: "hard",
    pointsLabel: "600〜700点",
    note: "医療機関との共同指導への参加が要件。病院との連携ルートが必要。",
    sourceUrl: NKDESK_R8,
    lastReviewed: "未確認",
  },
  {
    id: "mukin",
    name: "無菌製剤処理加算",
    category: "調剤技術",
    difficulty: "hard",
    pointsLabel: "69〜237点",
    note: "クリーンベンチ等の設備投資が必要。共同利用の枠組みもある。小児加算の対象が6歳未満から15歳未満に拡大。",
    sourceUrl: MHLW_GAIYO,
    lastReviewed: REVIEWED_MHLW,
  },
  {
    id: "jikaseizai",
    name: "自家製剤加算・計量混合調剤加算",
    category: "調剤技術",
    difficulty: "medium",
    pointsLabel: "処方内容により変動",
    note: "算定漏れが頻発する定番項目。レセコンの算定チェック設定を見直す価値あり。",
    sourceUrl: NKDESK_R8,
    lastReviewed: "未確認",
  },
  {
    id: "chouzai-go",
    name: "調剤後薬剤管理指導料(糖尿病・慢性心不全)",
    category: "薬学管理",
    difficulty: "medium",
    pointsLabel: "60点/月",
    note: "調剤後の電話等フォローが要件。地域支援系の実績にも絡むため、在宅・かかりつけ強化とセットで設計したい。",
    sourceUrl: NKDESK_R8,
    lastReviewed: "未確認",
  },
  {
    id: "fukuyaku-chousei",
    name: "服用薬剤調整支援料",
    category: "薬学管理",
    difficulty: "medium",
    pointsLabel: "支援料1: 125点 / 支援料2: 1,000点(令和9年6月適用)",
    note: "支援料2は大幅増点だが、かかりつけ薬剤師による包括的な薬物療法評価(MRP特定・観察計画等)が要件化。多剤併用の患者層が多い薬局なら本命級。フォローアップ加算の対象患者にも直結。",
    sourceUrl: MHLW_GAIYO,
    lastReviewed: REVIEWED_MHLW,
  },
  {
    id: "gairai-shien1",
    name: "外来服薬支援料1",
    category: "薬学管理",
    difficulty: "medium",
    pointsLabel: "185点",
    note: "持参薬の整理・一包化など。地域支援の実績⑤にカウント。フォローアップ加算の対象患者にもなる。",
    sourceUrl: NKDESK_R8,
    lastReviewed: "未確認",
  },
  {
    id: "bio-kousoku",
    name: "バイオ後続品調剤体制加算",
    category: "体制・届出",
    difficulty: "medium",
    pointsLabel: "50点(バイオ後続品調剤時)",
    note: "2026年新設。バイオ医薬品の応需がある薬局向け。保管・説明体制の整備が要件。バイオ後続品の説明は特定薬剤管理指導加算3ロ(10点)の対象にも追加。",
    sourceUrl: MHLW_GAIYO,
    lastReviewed: REVIEWED_MHLW,
  },
  {
    id: "fukuyaku-jouhou",
    name: "服薬情報等提供料",
    category: "薬学管理",
    difficulty: "easy",
    pointsLabel: "20〜50点",
    note: "1回あたりは小さいが、地域支援系の実績⑦(年間回数)に直結。診断の「服薬情報等提供」の入力値そのもの。",
    sourceUrl: NKDESK_R8,
    lastReviewed: "未確認",
  },
  {
    id: "bukka",
    name: "調剤物価対応料",
    category: "体制・届出",
    difficulty: "easy",
    pointsLabel: "1点(3月に1回)",
    note: "2026年新設。金額は小さいがレセコン設定のみで算定可能。設定漏れだけ確認を。",
    sourceUrl: MHLW_GAIYO,
    lastReviewed: REVIEWED_MHLW,
  },
  {
    id: "keikan",
    name: "経管投薬支援料・在宅移行初期管理料",
    category: "在宅",
    difficulty: "hard",
    pointsLabel: "初回・月1回など",
    note: "在宅・施設対応の周辺項目。在宅本格化とセットで検討。",
    sourceUrl: NKDESK_R8,
    lastReviewed: "未確認",
  },
];
