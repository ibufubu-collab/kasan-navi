import { describe, expect, it } from "vitest";
import { DiagnosisInputs, KASAN_MASTER } from "@/data/kasan-master";
import { achievedJisseki, evaluate, evaluateKasan, nextActions } from "@/lib/engine";

// rx=1000/月 → 年間12,000枚 → 実績の正規化係数 1.2
// ⑥在宅: 24×1.2=28.8 → 29件以上 / ⑦TR(基本料1): 30×1.2=36 → 36回以上
// 要件はすべて満たすが、何も算定していない薬局
const base: DiagnosisInputs = {
  rx: 1000,
  zaitaku: 30,
  gePct: 85,
  trace: 40,
  kakaritsuke: 40,
  kyotsu: true,
  anteikyokyu: true,
  zanyaku: true,
  baseup: true,
  dx: true,
  yuugai: true,
  hairisk: true,
  mayaku: true,
  kyunyu: true,
  followup: true,
  kihon1: true,
  jisseki: ["j4"],
  taking: [],
  chiikiKubun: "none",
};

const ALL_IDS = KASAN_MASTER.map((k) => k.id).filter((id) => id !== "chiiki-shien");
const allTaking: DiagnosisInputs = { ...base, taking: ALL_IDS, chiikiKubun: "ku2" };

const find = (id: string) => KASAN_MASTER.find((k) => k.id === id)!;
const chiikiShien = find("chiiki-shien");
const zanyaku = find("zanyaku-chousei");
const followup = find("kakaritsuke-followup");
const baseup = find("baseup");
const dxRenkei = find("dx-renkei");

describe("実績①〜⑨の判定(処方箋1万枚あたりで正規化)", () => {
  it("自己申告 + 数値からの自動判定(⑥⑦)を合算する", () => {
    const achieved = achievedJisseki(base);
    expect(achieved.has("j4")).toBe(true);
    expect(achieved.has("j6")).toBe(true); // 30件 >= 29件(24×1.2切り上げ)
    expect(achieved.has("j7")).toBe(true); // 40回 >= 36回(30×1.2)
    expect(achieved.size).toBe(3);
  });

  it("処方箋枚数が多いほど必要回数が上がる(在宅30件は rx=1500 では未達)", () => {
    const achieved = achievedJisseki({ ...base, rx: 1500 }); // 24×1.8=43.2 → 44件必要
    expect(achieved.has("j6")).toBe(false);
  });

  it("基本料1以外は⑦の基準が60回ベースになる", () => {
    const achieved = achievedJisseki({ ...base, kihon1: false }); // 60×1.2=72回必要
    expect(achieved.has("j7")).toBe(false);
  });

  it("derived項目(⑥⑦)は自己申告では達成にならない", () => {
    const achieved = achievedJisseki({ ...base, zaitaku: 0, trace: 0, jisseki: ["j6", "j7"] });
    expect(achieved.has("j6")).toBe(false);
    expect(achieved.has("j7")).toBe(false);
  });
});

describe("地域支援の区分判定(公式モデル)", () => {
  it("基本料1 + ④を含む実績3項目で加算2(59点)の要件を満たす(未算定なら ready)", () => {
    const r = evaluateKasan(chiikiShien, base);
    expect(r.status).toBe("ready");
    expect(r.variantName).toBe("加算2");
    expect(r.monthlyYen).toBe(59 * 10 * 1000);
    expect(r.upgrade?.variantName).toBe("加算3");
    expect(r.upgrade?.missing[0].text).toContain("実績項目 あと4項目");
  });

  it("加算1で算定中だが加算2の要件を満たすなら、届出変更だけのアップ提案", () => {
    const r = evaluateKasan(chiikiShien, { ...base, chiikiKubun: "ku1" });
    expect(r.status).toBe("taking");
    expect(r.upgrade?.variantName).toBe("加算2");
    expect(r.upgrade?.missing).toHaveLength(0);
    expect(r.upgrade?.extraYen).toBe((59 - 27) * 10 * 1000);
  });

  it("④かかりつけ実績がないと加算2は必須実績の不足になる", () => {
    const r = evaluateKasan(chiikiShien, { ...base, jisseki: [] });
    // ⑥⑦は達成済みなので加算1は満たし、加算2は④不足(項目数は2/9)
    expect(r.status).toBe("ready");
    expect(r.variantName).toBe("加算1");
    expect(r.upgrade?.variantName).toBe("加算2");
    expect(r.upgrade?.missing[0].text).toContain("必須実績: ④");
  });

  it("基本料1以外は加算4が目標になり、④⑥が必須", () => {
    const r = evaluateKasan(chiikiShien, { ...base, kihon1: false });
    // ⑦が未達(72回必要)になるが、④⑥は達成 → 実績3項目(④⑥+j4?)…④+⑥で2項目+自己申告j4は同一
    expect(r.status).toBe("ready");
    expect(r.variantName).toBe("加算1");
    expect(r.upgrade?.variantName).toBe("加算4");
  });

  it("後発品率84%は全区分未達(基礎要件)", () => {
    const r = evaluateKasan(chiikiShien, { ...base, gePct: 84 });
    expect(r.status).toBe("near");
    expect(r.missing[0].text).toBe("後発品調剤率 あと1pt");
  });

  it("安定供給体制なし + 後発品率不足は unmet", () => {
    const r = evaluateKasan(chiikiShien, { ...base, gePct: 80, anteikyokyu: false });
    expect(r.status).toBe("unmet");
    expect(r.missing.length).toBeGreaterThanOrEqual(2);
  });

  it("加算2で算定中なのに実績が崩れているとコンプライアンス警告", () => {
    const r = evaluateKasan(chiikiShien, { ...base, chiikiKubun: "ku2", jisseki: [], zaitaku: 0, trace: 0 });
    expect(r.status).toBe("taking");
    expect(r.complianceWarning).toBe(true);
  });
});

describe("算定状況アンケート(taking)の反映", () => {
  it("要件を満たしていても未申告なら ready(今すぐ取れる)になる", () => {
    const r = evaluateKasan(baseup, base);
    expect(r.status).toBe("ready");
    expect(r.monthlyYen).toBe(4 * 10 * 1000);
  });

  it("算定中と申告すれば taking になる", () => {
    const r = evaluateKasan(baseup, { ...base, taking: ["baseup"] });
    expect(r.status).toBe("taking");
  });

  it("算定中なのに要件を満たさない入力ならコンプライアンス警告が付く", () => {
    const r = evaluateKasan(baseup, { ...base, taking: ["baseup"], baseup: false });
    expect(r.status).toBe("taking");
    expect(r.complianceWarning).toBe(true);
  });
});

describe("金額計算", () => {
  it("フォローアップ加算: 50点 × 同意患者 ÷ 3ヶ月で整数に丸める", () => {
    const r = evaluateKasan(followup, base);
    expect(r.monthlyYen).toBe(Math.round((50 * 10 * 40) / 3));
    expect(Number.isInteger(r.monthlyYen)).toBe(true);
  });

  it("event: 発生件数は四捨五入される", () => {
    const r = evaluateKasan(zanyaku, { ...base, rx: 1234 });
    expect(r.monthlyYen).toBe(30 * 10 * Math.round(1234 * 0.03));
  });

  it("dx-renkei: 受付の30%が月1回算定の仮定", () => {
    const r = evaluateKasan(dxRenkei, base);
    expect(r.monthlyYen).toBe(8 * 10 * Math.round(1000 * 0.3));
  });
});

describe("全体集計", () => {
  it("全部算定中なら ready/build は 0", () => {
    const r = evaluate(allTaking);
    expect(r.readyYen).toBe(0);
    expect(r.buildYen).toBe(0);
    expect(r.gotYen).toBeGreaterThan(0);
  });

  it("要件は満たすが何も算定していなければ全額が readyYen に積まれる", () => {
    const r = evaluate(base);
    const total = r.items.reduce((sum, i) => sum + i.monthlyYen, 0);
    expect(r.gotYen).toBe(0);
    expect(r.buildYen).toBe(0);
    expect(r.readyYen).toBe(total);
  });

  it("got/ready/build は二重計上しない", () => {
    const inputs = { ...allTaking, taking: ALL_IDS.filter((id) => id !== "baseup"), zanyaku: false };
    const r = evaluate(inputs);
    const total = r.items.reduce((sum, i) => sum + i.monthlyYen, 0);
    expect(r.gotYen + r.readyYen + r.buildYen).toBe(total);
    expect(r.readyYen).toBe(4 * 10 * inputs.rx);
  });
});

describe("ネクストアクション", () => {
  it("金額の大きい順に並び、ready は届出のみの案内になる", () => {
    const r = evaluate(base);
    const actions = nextActions(r, 3);
    expect(actions.length).toBe(3);
    expect(actions[0].yen).toBeGreaterThanOrEqual(actions[1].yen);
    expect(actions[0].readyToTake).toBe(true);
    expect(actions[0].actions[0].text).toContain("届出");
  });
});

describe("マスタの健全性", () => {
  it("診断対象の加算は要件と根拠URLを持つ", () => {
    for (const k of KASAN_MASTER) {
      expect(k.requirements.length).toBeGreaterThan(0);
      expect(k.sourceUrl).toMatch(/^https:/);
      expect(k.pointsNote.length).toBeGreaterThan(0);
    }
  });

  it("event型の加算は eventRate を持つ", () => {
    for (const k of KASAN_MASTER.filter((k) => k.per === "event")) {
      expect(k.eventRate).toBeGreaterThan(0);
      expect(k.eventRate).toBeLessThan(1);
    }
  });
});
