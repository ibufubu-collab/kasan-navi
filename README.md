# 加算ナビ(仮) — 薬局の加算取りこぼし診断

2026年度(令和8年度)調剤報酬改定に対応した、薬局向けの加算取りこぼし診断ツール。
設計の背景と全体計画は [MVP-DESIGN.md](MVP-DESIGN.md) を参照。

## 開発

```bash
npm install
npm run dev    # http://localhost:3000
npm test       # 計算エンジンのユニットテスト
npm run build  # 本番ビルド確認
```

## 公開前にやること(チェックリスト)

1. **加算マスタの確認(最重要)**: `data/kasan-master.ts` の点数・要件を日薬の点数表PDFと
   突き合わせて修正し、各項目の `lastReviewed` を確認日に更新する。
2. **運営者情報**: `app/legal/page.tsx` と `app/page.tsx` の TODO に氏名/屋号・連絡先・経歴を書く。
3. **Supabase**: プロジェクトを作成し、下のSQLを SQL Editor で実行。`.env.local.example` を
   `.env.local` にコピーして URL と anon key を入れる(Vercel には環境変数として設定)。
4. **Vercel デプロイ**: GitHub リポジトリを作って push → Vercel でインポート。独自ドメインとOGP画像は任意。

## Supabase セットアップSQL

```sql
create table diagnoses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  inputs jsonb not null,
  results jsonb not null,
  source text
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  email text not null,
  diagnosis_id uuid references diagnoses(id),
  wants_interview boolean default false
);

create table feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  diagnosis_id uuid references diagnoses(id),
  believable int,
  would_pay text,
  comment text
);

alter table diagnoses enable row level security;
alter table leads enable row level security;
alter table feedback enable row level security;

-- 匿名キーからは insert のみ許可(diagnoses は insert 後に id を返すため select も許可)
create policy "anon insert diagnoses" on diagnoses for insert with check (true);
create policy "anon select own diagnoses" on diagnoses for select using (true);
create policy "anon insert leads" on leads for insert with check (true);
create policy "anon insert feedback" on feedback for insert with check (true);
```

注: `diagnoses` の select を許可しているのは insert 直後に id を取得するため。
中身は匿名の集計値のみで個人情報を含まない。`leads` と `feedback` は select 不可
(閲覧は Supabase ダッシュボードから)。

## 知人テストの回し方

- URL の末尾に `?src=友人名` のようなタグを付けて1人ずつ送ると、誰経由の診断かログで追える
  (例: `https://例.com/shindan?src=tanaka`)。
- 聞くことは3つ: ①入力で詰まった場所 ②金額の納得感 ③月5,000円版に何があれば払うか。
- 可能なら2〜3人は画面共有か対面で操作を観察する。

## 構成

- `data/kasan-master.ts` — 加算の定義(点数・要件・アドバイス・根拠URL)。**本体資産。改定時はここだけ直す**
- `lib/engine.ts` — 判定・金額計算(決定論的。LLM不使用)
- `lib/engine.test.ts` — 境界値テスト
- `lib/codec.ts` — 入力値のURLクエリ変換(結果URLの共有用)
- `lib/track.ts` — Supabaseへの記録(未設定時は何もしない)
- `app/` — LP(`/`)、診断(`/shindan`)、結果(`/shindan/kekka`)、登録完了、免責
