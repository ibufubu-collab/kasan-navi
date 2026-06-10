import { ChiikiKubun, DiagnosisInputs, JISSEKI_ITEMS, JissekiId, KASAN_MASTER } from "@/data/kasan-master";

// 入力値をURLクエリに載せるためのエンコード/デコード。
// 個人情報を含まない月次集計値のみなので、結果URLは共有可能。

export const DEFAULT_INPUTS: DiagnosisInputs = {
  rx: 1200,
  zaitaku: 0,
  gePct: 80,
  trace: 0,
  kakaritsuke: 0,
  kyotsu: false,
  anteikyokyu: false,
  zanyaku: false,
  baseup: false,
  dx: false,
  yuugai: false,
  hairisk: false,
  mayaku: false,
  kyunyu: false,
  followup: false,
  kihon1: true,
  jisseki: [],
  taking: [],
  chiikiKubun: "none",
};

const KASAN_IDS = new Set(KASAN_MASTER.map((k) => k.id));
const JISSEKI_IDS = new Set<JissekiId>(JISSEKI_ITEMS.map((i) => i.id));
const KUBUN_VALUES = new Set<ChiikiKubun>(["none", "ku1", "ku2", "ku3", "ku4", "ku5"]);

const NUMERIC_KEYS = ["rx", "zaitaku", "gePct", "trace", "kakaritsuke"] as const;
const BOOLEAN_KEYS = [
  "kyotsu",
  "anteikyokyu",
  "zanyaku",
  "baseup",
  "dx",
  "yuugai",
  "hairisk",
  "mayaku",
  "kyunyu",
  "followup",
  "kihon1",
] as const;

export function encodeInputs(inputs: DiagnosisInputs): string {
  const params = new URLSearchParams();
  for (const key of NUMERIC_KEYS) params.set(key, String(inputs[key]));
  for (const key of BOOLEAN_KEYS) params.set(key, inputs[key] ? "1" : "0");
  if (inputs.jisseki.length > 0) params.set("jisseki", inputs.jisseki.join(","));
  if (inputs.taking.length > 0) params.set("taking", inputs.taking.join(","));
  if (inputs.chiikiKubun !== "none") params.set("kubun", inputs.chiikiKubun);
  return params.toString();
}

export function decodeInputs(params: URLSearchParams): DiagnosisInputs {
  const inputs: DiagnosisInputs = { ...DEFAULT_INPUTS };
  for (const key of NUMERIC_KEYS) {
    const raw = params.get(key);
    if (raw === null) continue;
    const value = Number(raw);
    if (Number.isFinite(value) && value >= 0) inputs[key] = Math.min(value, 1_000_000);
  }
  for (const key of BOOLEAN_KEYS) {
    const raw = params.get(key);
    if (raw !== null) inputs[key] = raw === "1";
  }
  const jisseki = params.get("jisseki");
  if (jisseki) inputs.jisseki = jisseki.split(",").filter((id): id is JissekiId => JISSEKI_IDS.has(id as JissekiId));
  const taking = params.get("taking");
  if (taking) inputs.taking = taking.split(",").filter((id) => KASAN_IDS.has(id));
  const kubun = params.get("kubun") as ChiikiKubun | null;
  if (kubun && KUBUN_VALUES.has(kubun)) inputs.chiikiKubun = kubun;
  return inputs;
}
